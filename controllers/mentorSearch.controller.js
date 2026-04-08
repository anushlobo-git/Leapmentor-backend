// backend/controllers/mentorSearch.controller.js
const MentorProfile = require("../models/MentorProfile");
const User          = require("../models/User");

const searchMentors = async (req, res) => {
  try {
    const {
      skill = "", name = "",
      industry = "",
      minPrice, maxPrice, minRating,
      minExperience, maxExperience,
      page = 1, limit = 6,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // Validate price range
    if (minPrice !== undefined && maxPrice !== undefined) {
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (!isNaN(min) && !isNaN(max) && min > max) {
        return res.status(200).json({
          success: true,
          mentors: [],
          pagination: { totalCount: 0, totalPages: 0, currentPage: pageNum, hasMore: false },
        });
      }
    }

    const hasQuery   = skill.trim() || name.trim();
    const hasFilters = industry.trim() || minPrice !== undefined
                       || maxPrice !== undefined || minRating !== undefined
                       || minExperience !== undefined || maxExperience !== undefined;

    if (!hasQuery && !hasFilters) {
      return await plainList(res, pageNum, limitNum, skip);
    }

    // ── Step 1: Name search
    let nameMatchedProfileUserIds = null;

    if (name.trim()) {
      const matchingUsers = await User.find({
        name:  { $regex: name.trim(), $options: "i" },
        roles: { $in: ["mentor"] },
      }).select("_id").lean();

      nameMatchedProfileUserIds = new Set(
        matchingUsers.map((u) => u._id.toString())
      );
    }

    // ── Step 2: Atlas Search filter/must/should clauses
    const filterClauses = [
      { equals: { path: "isProfilePublished", value: true } },
      { equals: { path: "isProfileComplete",  value: true } },
    ];
    const mustClauses   = [];
    const shouldClauses = [];

    if (skill.trim()) {
      shouldClauses.push({
        autocomplete: { query: skill.trim(), path: "skills",      fuzzy: { maxEdits: 1 }, score: { boost: { value: 10 } } },
      });
      shouldClauses.push({
        autocomplete: { query: skill.trim(), path: "currentRole", fuzzy: { maxEdits: 1 }, score: { boost: { value: 5  } } },
      });
      shouldClauses.push({
        text: { query: skill.trim(), path: ["industry", "company"], fuzzy: { maxEdits: 1 }, score: { boost: { value: 3 } } },
      });
    }

    if (industry.trim()) {
      mustClauses.push({ text: { query: industry.trim(), path: "industry", fuzzy: { maxEdits: 1 } } });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const r = { range: { path: "hourlyRate" } };
      if (minPrice !== undefined) r.range.gte = Number(minPrice);
      if (maxPrice !== undefined) r.range.lte = Number(maxPrice);
      filterClauses.push(r);
    }

    if (minRating !== undefined) {
      filterClauses.push({ range: { path: "avgRating", gte: Number(minRating) } });
    }

    // ✅ Build experience $match to apply AFTER Atlas (avoids Atlas index issues)
    const expMatch = {};
    if (minExperience !== undefined || maxExperience !== undefined) {
      expMatch.yearsOfExperience = {};
      if (minExperience !== undefined) expMatch.yearsOfExperience.$gte = Number(minExperience);
      if (maxExperience !== undefined) expMatch.yearsOfExperience.$lte = Number(maxExperience);
    }

    const compound = { filter: filterClauses };
    if (mustClauses.length   > 0) compound.must   = mustClauses;
    if (shouldClauses.length > 0) compound.should  = shouldClauses;

    // ── Step 3: Pipeline — experience applied as $match, not Atlas range
    const pipeline = [
      { $search: { index: "mentor_search", compound } },
      { $addFields: { searchScore: { $meta: "searchScore" } } },

      // ✅ Post-Atlas experience filter — works regardless of Atlas index config
      ...(Object.keys(expMatch).length > 0 ? [{ $match: expMatch }] : []),

      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDoc" } },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: false } },

      {
        $match: (() => {
          const skillSearched = !!skill.trim();
          const nameSearched  = nameMatchedProfileUserIds !== null;
          if (skillSearched && nameSearched) return { $or: [{ searchScore: { $gt: 0 } }] };
          if (skillSearched) return { searchScore: { $gt: 0 } };
          return {};
        })(),
      },

      {
        $facet: {
          results: [
            { $sort: { searchScore: -1, avgRating: -1 } },
            { $skip: 0 },
            { $limit: 200 },
            {
              $project: {
                _id: 1, currentRole: 1, industry: 1, company: 1, skills: 1,
                hourlyRate: 1, avgRating: 1, profilePicture: 1,
                linkedInUrl: 1, portfolioUrl: 1, searchScore: 1,
                yearsOfExperience: 1, bio: 1, verificationStatus: 1,
                user: { _id: "$userDoc._id", name: "$userDoc.name", email: "$userDoc.email" },
              },
            },
          ],
        },
      },
    ];

    const [facetResult] = await MentorProfile.aggregate(pipeline);
    let results = facetResult?.results || [];

    // ── Step 4: JS-level union for name matches
    if (nameMatchedProfileUserIds && nameMatchedProfileUserIds.size > 0) {
      const atlasResultUserIds = new Set(results.map((r) => r.user._id.toString()));

      const missingIds = [...nameMatchedProfileUserIds].filter(
        (id) => !atlasResultUserIds.has(id)
      );

      if (missingIds.length > 0) {
        const extraFilter = {
          user: { $in: missingIds },
          isProfilePublished: true,
          isProfileComplete: true,
          ...expMatch, // ✅ apply experience filter here too
        };

        const extraProfiles = await MentorProfile.find(extraFilter)
          .populate("user", "name email")
          .select("user currentRole industry company skills hourlyRate avgRating profilePicture linkedInUrl portfolioUrl yearsOfExperience bio verificationStatus")
          .lean();

        const withScore = extraProfiles.map((p) => ({
          ...p, searchScore: 2,
          user: { _id: p.user._id, name: p.user.name, email: p.user.email },
        }));

        results = [...withScore, ...results];
      }

      if (!skill.trim()) {
        results = results.filter((r) =>
          nameMatchedProfileUserIds.has(r.user._id.toString())
        );
      }
    }

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        mentors: [],
        pagination: { totalCount: 0, totalPages: 0, currentPage: pageNum, hasMore: false },
      });
    }

    const totalCount = results.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const paginated  = results.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      mentors: paginated,
      pagination: { totalCount, totalPages, currentPage: pageNum, hasMore: pageNum < totalPages },
    });

  } catch (err) {
    console.error("❌ Mentor search error:", err.message);
    if (err.message?.includes("$search") || err.message?.includes("search index")) {
      console.warn("⚠️  Atlas Search unavailable — falling back to regex");
      return fallbackSearch(req, res);
    }
    return res.status(500).json({ success: false, message: "use proper price ranges(min - max)" });
  }
};

// ─────────────────────────────────────────────────────────────
// Helper — return all published mentors (no search)
// ─────────────────────────────────────────────────────────────
const plainList = async (res, pageNum, limitNum, skip) => {
  const filter = { isProfilePublished: true, isProfileComplete: true };
  const [totalCount, mentors] = await Promise.all([
    MentorProfile.countDocuments(filter),
    MentorProfile.find(filter)
      .populate("user", "name email")
      .select("user currentRole industry company skills hourlyRate avgRating profilePicture linkedInUrl portfolioUrl yearsOfExperience bio verificationStatus")
      .sort({ avgRating: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);
  const totalPages = Math.ceil(totalCount / limitNum);
  return res.status(200).json({
    success: true,
    mentors,
    pagination: { totalCount, totalPages, currentPage: pageNum, hasMore: pageNum < totalPages },
  });
};

// ─────────────────────────────────────────────────────────────
// GET /api/mentors/autocomplete
// ─────────────────────────────────────────────────────────────
const autocompleteMentors = async (req, res) => {
  try {
    const { q = "" } = req.query;
    if (!q.trim()) return res.json({ success: true, suggestions: [] });

    const pipeline = [
      {
        $search: {
          index: "mentor_autocomplete",
          compound: {
            must: [
              { equals: { path: "isProfilePublished", value: true } },
              { equals: { path: "isProfileComplete",  value: true } },
            ],
            should: [
              { autocomplete: { query: q.trim(), path: "skills",      fuzzy: { maxEdits: 1 } } },
              { autocomplete: { query: q.trim(), path: "currentRole", fuzzy: { maxEdits: 1 } } },
            ],
          },
        },
      },
      { $limit: 8 },
      { $project: { skills: 1, currentRole: 1, _id: 0 } },
    ];

    const [profileResults, nameResults] = await Promise.all([
      MentorProfile.aggregate(pipeline),
      User.find({
        name:  { $regex: q.trim(), $options: "i" },
        roles: { $in: ["mentor"] },
      }).select("name").limit(3).lean(),
    ]);

    const skillSet = new Set();
    const roleSet  = new Set();
    const nameSet  = new Set();

    profileResults.forEach((r) => {
      r.skills?.forEach((s) => { if (s.toLowerCase().includes(q.toLowerCase())) skillSet.add(s); });
      if (r.currentRole?.toLowerCase().includes(q.toLowerCase())) roleSet.add(r.currentRole);
    });
    nameResults.forEach((u) => nameSet.add(u.name));

    return res.json({
      success: true,
      suggestions: [
        ...[...skillSet].slice(0, 4).map((s) => ({ type: "skill", label: s })),
        ...[...roleSet].slice(0, 2).map((r)  => ({ type: "role",  label: r })),
        ...[...nameSet].slice(0, 3).map((n)  => ({ type: "name",  label: n })),
      ],
    });
  } catch (err) {
    console.error("❌ Autocomplete error:", err.message);
    return res.json({ success: true, suggestions: [] });
  }
};

// ─────────────────────────────────────────────────────────────
// Fallback — regex if Atlas unavailable
// ─────────────────────────────────────────────────────────────
const fallbackSearch = async (req, res) => {
  try {
    const {
      skill = "", name = "", industry = "",
      minPrice, maxPrice, minRating,
      minExperience, maxExperience,
      page = 1, limit = 6,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;
    const query    = skill.trim() || name.trim();

    const filter = { isProfilePublished: true, isProfileComplete: true };

    if (query) {
      const matchingUsers = await User.find({
        name:  { $regex: query, $options: "i" },
        roles: { $in: ["mentor"] },
      }).select("_id").lean();

      const orConditions = [];
      if (matchingUsers.length > 0) {
        orConditions.push({ user: { $in: matchingUsers.map((u) => u._id) } });
      }
      orConditions.push({ skills: { $elemMatch: { $regex: query, $options: "i" } } });
      filter.$or = orConditions;
    }

    if (industry.trim())    filter.industry  = { $regex: industry.trim(), $options: "i" };
    if (minRating !== undefined) filter.avgRating = { $gte: Number(minRating) };

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.hourlyRate = {};
      if (minPrice !== undefined) filter.hourlyRate.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.hourlyRate.$lte = Number(maxPrice);
    }

    if (minExperience !== undefined || maxExperience !== undefined) {
      filter.yearsOfExperience = {};
      if (minExperience !== undefined) filter.yearsOfExperience.$gte = Number(minExperience);
      if (maxExperience !== undefined) filter.yearsOfExperience.$lte = Number(maxExperience);
    }

    const [totalCount, mentors] = await Promise.all([
      MentorProfile.countDocuments(filter),
      MentorProfile.find(filter)
        .populate("user", "name email")
        .select("user currentRole industry company skills hourlyRate avgRating profilePicture linkedInUrl portfolioUrl yearsOfExperience bio verificationStatus")
        .sort({ avgRating: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      mentors,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        hasMore: pageNum < Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { searchMentors, autocompleteMentors };