/**
 * @fileoverview Mentor Search Business Logic Service
 * @description Compiles Atlas search stages, handles matching metric scoring sets, and coordinates regex fallbacks.
 */
const AppError = require("../utils/AppError");
const mentorSearchRepository = require("../repositories/mentor.repository");
const userRepository=require("../repositories/user.repository");

// Upper-case Domain Architecture Constants
const ROLE_MENTOR = "mentor";
const ATLAS_SEARCH_INDEX = "mentor_search";
const ATLAS_AUTOCOMPLETE_INDEX = "mentor_autocomplete";
const DEFAULT_PAGE_MINIMUM = 1;
const CONFIG_MAX_LIMIT = 20;
const CONFIG_DEFAULT_LIMIT = 6;
const ATLAS_PIPELINE_CAP = 200;
const AUTOCOMPLETE_PIPELINE_LIMIT = 8;
const EXTRA_NAME_MATCH_SCORE = 2;

/**
 * Generates a clean baseline list of active mentors when no filters or query values exist.
 */
const getPlainList = async (pageNum, limitNum, skip) => {
  const filter = { isProfilePublished: true, isProfileComplete: true };
  const [totalCount, mentors] = await Promise.all([
    mentorSearchRepository.countMentorProfiles(filter),
    mentorSearchRepository.findMentorsWithUserPopulation(
      filter,
      { avgRating: -1 },
      skip,
      limitNum,
    ),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);
  return {
    mentors,
    pagination: {
      totalCount,
      totalPages,
      currentPage: pageNum,
      hasMore: pageNum < totalPages,
    },
  };
};

/**
 * Handles explicit regex fallback operations when cloud search indexes are unavailable.
 */
const executeFallbackSearch = async (queryParams) => {
  const {
    skill = "",
    name = "",
    industry = "",
    minPrice,
    maxPrice,
    minRating,
    minExperience,
    maxExperience,
    page = 1,
    limit = 6,
  } = queryParams;

  const pageNum = Math.max(DEFAULT_PAGE_MINIMUM, parseInt(page, 10));
  const limitNum = Math.min(
    CONFIG_MAX_LIMIT,
    Math.max(DEFAULT_PAGE_MINIMUM, parseInt(limit, 10)),
  );
  const skip = (pageNum - 1) * limitNum;

  const filter = { isProfilePublished: true, isProfileComplete: true };

  const queryToken = skill.trim() || name.trim();
  if (queryToken) {
    const matchingUsers =
      await userRepository.findUsersByRoleAndNameRegex(queryToken, [
        ROLE_MENTOR,
      ]);
    const orConditions = [];
    if (matchingUsers.length > 0) {
      orConditions.push({ user: { $in: matchingUsers.map((u) => u._id) } });
    }
    orConditions.push({
      skills: { $elemMatch: { $regex: queryToken, $options: "i" } },
    });
    filter.$or = orConditions;
  }

  if (industry.trim())
    filter.industry = { $regex: industry.trim(), $options: "i" };
  if (minRating !== undefined) filter.avgRating = { $gte: Number(minRating) };

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.hourlyRate = {};
    if (minPrice !== undefined) filter.hourlyRate.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.hourlyRate.$lte = Number(maxPrice);
  }

  if (minExperience !== undefined || maxExperience !== undefined) {
    filter.yearsOfExperience = {};
    if (minExperience !== undefined)
      filter.yearsOfExperience.$gte = Number(minExperience);
    if (maxExperience !== undefined)
      filter.yearsOfExperience.$lte = Number(maxExperience);
  }

  const [totalCount, mentors] = await Promise.all([
    mentorSearchRepository.countMentorProfiles(filter),
    mentorSearchRepository.findMentorsWithUserPopulation(
      filter,
      { avgRating: -1 },
      skip,
      limitNum,
    ),
  ]);

  return {
    mentors,
    pagination: {
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      hasMore: pageNum < Math.ceil(totalCount / limitNum),
    },
  };
};

/**
 * Main orchestrator executing deep field analytics and scoring combinations over cloud aggregations.
 */
const queryMentors = async (queryParams) => {
  const {
    skill = "",
    name = "",
    industry = "",
    minPrice,
    maxPrice,
    minRating,
    minExperience,
    maxExperience,
    page = 1,
    limit = CONFIG_DEFAULT_LIMIT,
  } = queryParams;

  const pageNum = Math.max(DEFAULT_PAGE_MINIMUM, parseInt(page, 10));
  const limitNum = Math.min(
    CONFIG_MAX_LIMIT,
    Math.max(DEFAULT_PAGE_MINIMUM, parseInt(limit, 10)),
  );
  const skip = (pageNum - 1) * limitNum;

  if (minPrice !== undefined && maxPrice !== undefined) {
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      throw new AppError(
        "Invalid input boundary configurations: minPrice cannot exceed maxPrice limits",
        400,
      );
    }
  }

  const hasQuery = !!(skill.trim() || name.trim());
  const hasFilters = !!(
    industry.trim() ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    minRating !== undefined ||
    minExperience !== undefined ||
    maxExperience !== undefined
  );

  if (!hasQuery && !hasFilters) {
    return getPlainList(pageNum, limitNum, skip);
  }

  try {
    let nameMatchedProfileUserIds = null;
    if (name.trim()) {
      const matchingUsers =
        await mentorSearchRepository.findUsersByRoleAndNameRegex(name.trim(), [
          ROLE_MENTOR,
        ]);
      nameMatchedProfileUserIds = new Set(
        matchingUsers.map((u) => u._id.toString()),
      );
    }

    const filterClauses = [
      { equals: { path: "isProfilePublished", value: true } },
      { equals: { path: "isProfileComplete", value: true } },
    ];
    const mustClauses = [];
    const shouldClauses = [];

    if (skill.trim()) {
      shouldClauses.push({
        autocomplete: {
          query: skill.trim(),
          path: "skills",
          fuzzy: { maxEdits: 1 },
          score: { boost: { value: 10 } },
        },
      });
      shouldClauses.push({
        autocomplete: {
          query: skill.trim(),
          path: "currentRole",
          fuzzy: { maxEdits: 1 },
          score: { boost: { value: 5 } },
        },
      });
      shouldClauses.push({
        text: {
          query: skill.trim(),
          path: ["industry", "company"],
          fuzzy: { maxEdits: 1 },
          score: { boost: { value: 3 } },
        },
      });
    }

    if (industry.trim()) {
      mustClauses.push({
        text: {
          query: industry.trim(),
          path: "industry",
          fuzzy: { maxEdits: 1 },
        },
      });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const rangeObject = { range: { path: "hourlyRate" } };
      if (minPrice !== undefined) rangeObject.range.gte = Number(minPrice);
      if (maxPrice !== undefined) rangeObject.range.lte = Number(maxPrice);
      filterClauses.push(rangeObject);
    }

    if (minRating !== undefined) {
      filterClauses.push({
        range: { path: "avgRating", gte: Number(minRating) },
      });
    }

    const expMatch = {};
    if (minExperience !== undefined || maxExperience !== undefined) {
      expMatch.yearsOfExperience = {};
      if (minExperience !== undefined)
        expMatch.yearsOfExperience.$gte = Number(minExperience);
      if (maxExperience !== undefined)
        expMatch.yearsOfExperience.$lte = Number(maxExperience);
    }

    const compound = { filter: filterClauses };
    if (mustClauses.length > 0) compound.must = mustClauses;
    if (shouldClauses.length > 0) compound.should = shouldClauses;

    const pipeline = [
      { $search: { index: ATLAS_SEARCH_INDEX, compound } },
      { $addFields: { searchScore: { $meta: "searchScore" } } },
      ...(Object.keys(expMatch).length > 0 ? [{ $match: expMatch }] : []),
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: false } },
      {
        $match: (() => {
          const skillSearched = !!skill.trim();
          const nameSearched = nameMatchedProfileUserIds !== null;
          if (skillSearched && nameSearched)
            return { $or: [{ searchScore: { $gt: 0 } }] };
          if (skillSearched) return { searchScore: { $gt: 0 } };
          return {};
        })(),
      },
      {
        $facet: {
          results: [
            { $sort: { searchScore: -1, avgRating: -1 } },
            { $skip: 0 },
            { $limit: ATLAS_PIPELINE_CAP },
            {
              $project: {
                _id: 1,
                currentRole: 1,
                industry: 1,
                company: 1,
                skills: 1,
                hourlyRate: 1,
                avgRating: 1,
                profilePicture: 1,
                linkedInUrl: 1,
                portfolioUrl: 1,
                searchScore: 1,
                yearsOfExperience: 1,
                bio: 1,
                verificationStatus: 1,
                user: {
                  _id: "$userDoc._id",
                  name: "$userDoc.name",
                  email: "$userDoc.email",
                },
              },
            },
          ],
        },
      },
    ];

    const [facetResult] =
      await mentorSearchRepository.aggregateMentorProfiles(pipeline);
    let results = facetResult?.results || [];

    if (nameMatchedProfileUserIds && nameMatchedProfileUserIds.size > 0) {
      const atlasResultUserIds = new Set(
        results.map((r) => r.user._id.toString()),
      );
      const missingIds = [...nameMatchedProfileUserIds].filter(
        (id) => !atlasResultUserIds.has(id),
      );

      if (missingIds.length > 0) {
        const extraFilter = {
          user: { $in: missingIds },
          isProfilePublished: true,
          isProfileComplete: true,
          ...expMatch,
        };

        const extraProfiles =
          await mentorSearchRepository.findMentorsWithUserPopulation(
            extraFilter,
            { avgRating: -1 },
            0,
            ATLAS_PIPELINE_CAP,
          );

        const withScore = extraProfiles.map((p) => ({
          ...p,
          searchScore: EXTRA_NAME_MATCH_SCORE,
          user: { _id: p.user._id, name: p.user.name, email: p.user.email },
        }));

        results = [...withScore, ...results];
      }

      if (!skill.trim()) {
        results = results.filter((r) =>
          nameMatchedProfileUserIds.has(r.user._id.toString()),
        );
      }
    }

    if (results.length === 0) {
      return {
        mentors: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
          currentPage: pageNum,
          hasMore: false,
        },
      };
    }

    const totalCount = results.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const paginated = results.slice(skip, skip + limitNum);

    return {
      mentors: paginated,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        hasMore: pageNum < totalPages,
      },
    };
  } catch (error) {
    if (
      error.message?.includes("$search") ||
      error.message?.includes("search index")
    ) {
      return executeFallbackSearch(queryParams);
    }
    throw error;
  }
};

/**
 * Compiles autocomplete lookups for search bar inputs.
 */
const getAutocompleteSuggestions = async (searchToken) => {
  if (!searchToken || !searchToken.trim()) {
    return { suggestions: [] };
  }

  const query = searchToken.trim();

  const pipeline = [
    {
      $search: {
        index: ATLAS_AUTOCOMPLETE_INDEX,
        compound: {
          must: [
            { equals: { path: "isProfilePublished", value: true } },
            { equals: { path: "isProfileComplete", value: true } },
          ],
          should: [
            { autocomplete: { query, path: "skills", fuzzy: { maxEdits: 1 } } },
            {
              autocomplete: {
                query,
                path: "currentRole",
                fuzzy: { maxEdits: 1 },
              },
            },
          ],
        },
      },
    },
    { $limit: AUTOCOMPLETE_PIPELINE_LIMIT },
    { $project: { skills: 1, currentRole: 1, _id: 0 } },
  ];

  const [profileResults, nameResults] = await Promise.all([
    mentorSearchRepository.aggregateMentorProfiles(pipeline),
    mentorSearchRepository.findUsersByRoleAndNameRegex(query, [ROLE_MENTOR]),
  ]);

  const skillSet = new Set();
  const roleSet = new Set();
  const nameSet = new Set();

  profileResults.forEach((profile) => {
    profile.skills?.forEach((skill) => {
      if (skill.toLowerCase().includes(query.toLowerCase()))
        skillSet.add(skill);
    });
    if (profile.currentRole?.toLowerCase().includes(query.toLowerCase()))
      roleSet.add(profile.currentRole);
  });

  nameResults.slice(0, 3).forEach((user) => nameSet.add(user.name));

  const suggestions = [
    ...[...skillSet]
      .slice(0, 4)
      .map((skill) => ({ type: "skill", label: skill })),
    ...[...roleSet].slice(0, 2).map((role) => ({ type: "role", label: role })),
    ...[...nameSet].slice(0, 3).map((name) => ({ type: "name", label: name })),
  ];

  return { suggestions };
};

module.exports = {
  queryMentors,
  getAutocompleteSuggestions,
};
