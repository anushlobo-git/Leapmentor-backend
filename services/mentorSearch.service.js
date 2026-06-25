/**
 * @fileoverview Service Layer for Mentor Discovery and Search Operations.
 * Handles high-performance Atlas Search queries with structural regex fallbacks,
 * facet-based pagination, and autocomplete compilation utilities.
 * @module services/mentorSearch
 * @requires ../utils/AppError
 * @requires ../repositories/mentor.repository
 * @requires ../repositories/user.repository
 * @requires ../config/logger
 */

const AppError = require("../utils/AppError");
const mentorSearchRepository = require("../repositories/mentor.repository");
const userRepository = require("../repositories/user.repository");
const logger = require("../config/logger");
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");

const ROLE_MENTOR = "mentor";
const ATLAS_SEARCH_INDEX = "mentor_search";
const DEFAULT_PAGE_MINIMUM = 1;
const CONFIG_MAX_LIMIT = 20;
const CONFIG_DEFAULT_LIMIT = 6;
const ATLAS_PIPELINE_CAP = 200;
const EXTRA_NAME_MATCH_SCORE = 2;

/**
 * Retrieves a simple, unfiltered list of published mentors sorted by rating.
 * Used when no search term or filters are applied to the request.
 * @async
 * @private
 * @param {number} pageNum - Current page pointer index.
 * @param {number} limitNum - Maximum records to include in the slice.
 * @param {number} skip - Offset skip record counter.
 * @returns {Promise<Object>} Formatted pagination result payload.
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
    mentors: mentors.map(toMentorProfileDTO),
    pagination: {
      totalCount,
      totalPages,
      currentPage: pageNum,
      hasMore: pageNum < totalPages,
    },
  };
};

/**
 * Fallback query runner utilizing standard database regular expressions.
 * Executed automatically if Atlas Search yields zero hits or is unreachable.
 * @async
 * @function executeFallbackSearch
 * @param {Object} queryParams - Raw entry query string properties map.
 * @returns {Promise<Object>} RegEx matched pagination result payload.
 */
const executeFallbackSearch = async (queryParams) => {
  logger.info("🔍 Initiating Database Regex Fallback Search Execution Engine");

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

  const pageNum = Math.max(DEFAULT_PAGE_MINIMUM, Number.parseInt(page, 10));
  const limitNum = Math.min(
    CONFIG_MAX_LIMIT,
    Math.max(DEFAULT_PAGE_MINIMUM, Number.parseInt(limit, 10)),
  );
  const skip = (pageNum - 1) * limitNum;

  const filter = { isProfilePublished: true, isProfileComplete: true };
  const queryToken = skill.trim() || name.trim();

  if (queryToken) {
    const matchingUsers = await userRepository.findUsersByRoleAndNameRegex(
      queryToken,
      [ROLE_MENTOR],
    );
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
    mentors: mentors.map(toMentorProfileDTO),
    pagination: {
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      hasMore: pageNum < Math.ceil(totalCount / limitNum),
    },
  };
};

/**
 * Searches and filters mentor registries via unified MongoDB Atlas indexing.
 * Includes auto-reverting fallback routes to eliminate blank responses.
 * @async
 * @function queryMentors
 * @param {Object} queryParams - Search terms and filter metrics from the request query string.
 * @returns {Promise<Object>} Structured array payload matching schema requirements.
 */
// ─────────────────────────────────────────────────────────────────────────────
// Private helpers — extracted to reduce cognitive complexity of queryMentors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses and clamps page + limit query parameters into safe integers.
 * @param {*} page  - Raw page value from query string.
 * @param {*} limit - Raw limit value from query string.
 * @returns {{ pageNum: number, limitNum: number, skip: number }}
 */
const parsePagination = (page, limit) => {
  const pageNum = Math.max(DEFAULT_PAGE_MINIMUM, Number.parseInt(page, 10));
  const limitNum = Math.min(
    CONFIG_MAX_LIMIT,
    Math.max(DEFAULT_PAGE_MINIMUM, Number.parseInt(limit, 10)),
  );
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

/**
 * Validates that minPrice does not exceed maxPrice when both are supplied.
 * @param {*} minPrice - Lower bound from query string.
 * @param {*} maxPrice - Upper bound from query string.
 * @throws {AppError} When minPrice > maxPrice.
 */
const validatePriceRange = (minPrice, maxPrice) => {
  if (minPrice === undefined || maxPrice === undefined) return;
  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
    throw new AppError("minPrice cannot exceed maxPrice.", 400);
  }
};

/**
 * Builds the Atlas Search compound object (filter / must / should clauses).
 * @param {string} skill     - Skill search term.
 * @param {string} industry  - Industry filter term.
 * @param {*}      minPrice  - Minimum hourly rate filter.
 * @param {*}      maxPrice  - Maximum hourly rate filter.
 * @param {*}      minRating - Minimum average rating filter.
 * @returns {{ compound: Object, filterClauses: Array }}
 */
const buildAtlasCompound = (skill, industry, minPrice, maxPrice, minRating) => {
  const filterClauses = [
    { equals: { path: "isProfilePublished", value: true } },
    { equals: { path: "isProfileComplete", value: true } },
  ];
  const mustClauses = [];
  const shouldClauses = [];

  if (skill.trim()) {
    shouldClauses.push(
      // ← RESTORE autocomplete (partial word matching)
      {
        autocomplete: {
          query: skill.trim(),
          path: "skills",
          fuzzy: { maxEdits: 1, prefixLength: 1 },
          score: { boost: { value: 10 } },
        },
      },
      {
        autocomplete: {
          query: skill.trim(),
          path: "currentRole",
          fuzzy: { maxEdits: 1, prefixLength: 1 },
          score: { boost: { value: 5 } },
        },
      },
      {
        text: {
          query: skill.trim(),
          path: "skills",
          fuzzy: { maxEdits: 2, prefixLength: 1 },
          score: { boost: { value: 8 } },
        },
      },
      {
        text: {
          query: skill.trim(),
          path: ["industry", "company"],
          fuzzy: { maxEdits: 1, prefixLength: 1 },
          score: { boost: { value: 3 } },
        },
      },
    );
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
    const range = { path: "hourlyRate" };
    if (minPrice !== undefined) range.gte = Number(minPrice);
    if (maxPrice !== undefined) range.lte = Number(maxPrice);
    filterClauses.push({ range });
  }

  if (minRating !== undefined) {
    filterClauses.push({
      range: { path: "avgRating", gte: Number(minRating) },
    });
  }

  const compound = { filter: filterClauses };
  if (mustClauses.length > 0) compound.must = mustClauses;
  if (shouldClauses.length > 0) {
    compound.should = shouldClauses;
    compound.minimumShouldMatch = 1; // ← RESTORE this
  }

  // ← RESTORE wildcard fallback for filter-only queries
  if (mustClauses.length === 0 && shouldClauses.length === 0) {
    compound.must = [{ exists: { path: "isProfilePublished" } }];
  }

  return compound;
};
/**
 * Builds the post-search $match stage for experience range filtering.
 * @param {*} minExperience - Minimum years of experience.
 * @param {*} maxExperience - Maximum years of experience.
 * @returns {Object} MongoDB match expression (may be empty).
 */
const buildExperienceMatch = (minExperience, maxExperience) => {
  if (minExperience === undefined && maxExperience === undefined) return {};
  const yearsOfExperience = {};
  if (minExperience !== undefined) yearsOfExperience.$gte = Number(minExperience);
  if (maxExperience !== undefined) yearsOfExperience.$lte = Number(maxExperience);
  return { yearsOfExperience };
};

/**
 * Resolves the $match filter stage used after $unwind in the Atlas pipeline.
 * Ensures only relevant docs are kept depending on which search terms were used.
 * @param {string}  skill                   - Skill search term.
 * @param {Set|null} nameMatchedProfileUserIds - Set of user IDs matched by name, or null.
 * @returns {Object} MongoDB $match expression.
 */
const buildScoreMatchStage = (skill) => {
  // Only filter by score when skill was searched
  // Filter-only queries (price/rating/industry) can have score = 0 legitimately
  if (skill.trim()) return { searchScore: { $gt: 0 } };
  return {}; // no score filter for filter-only or name-only searches
};

/**
 * Merges name-matched mentor profiles into Atlas Search results.
 * Appends profiles missing from Atlas results and filters by name when no skill is queried.
 * @param {Array}    results                 - Current Atlas pipeline results.
 * @param {Set|null} nameMatchedProfileUserIds - Set of user IDs matched by name regex.
 * @param {string}   skill                   - Skill search term (may be empty).
 * @param {Object}   expMatch                - Experience range filter.
 * @returns {Promise<Array>} Merged and filtered results array.
 */
const mergeNameMatches = async (results, nameMatchedProfileUserIds, skill, expMatch) => {
  if (!nameMatchedProfileUserIds || nameMatchedProfileUserIds.size === 0) {
    return results;
  }

  const atlasResultUserIds = new Set(results.map((r) => r.user._id.toString()));
  const missingIds = [...nameMatchedProfileUserIds].filter((id) => !atlasResultUserIds.has(id));

  let merged = results;

  if (missingIds.length > 0) {
    const extraFilter = {
      user: { $in: missingIds },
      isProfilePublished: true,
      isProfileComplete: true,
      ...expMatch,
    };
    const extraProfiles = await mentorSearchRepository.findMentorsWithUserPopulation(
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
    merged = [...withScore, ...results];
  }

  // When only searching by name (no skill), restrict results to name-matched profiles only
  if (!skill.trim()) {
    merged = merged.filter((r) => nameMatchedProfileUserIds.has(r.user._id.toString()));
  }

  return merged;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Searches and filters mentor registries via unified MongoDB Atlas indexing.
 * Includes auto-reverting fallback routes to eliminate blank responses.
 * Cognitive Complexity: ≤ 15 (refactored from 34).
 * @async
 * @function queryMentors
 * @param {Object} queryParams - Search terms and filter metrics from the request query string.
 * @returns {Promise<Object>} Structured array payload matching schema requirements.
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

  const { pageNum, limitNum, skip } = parsePagination(page, limit);

  validatePriceRange(minPrice, maxPrice); // throws AppError if invalid

  const hasQuery   = !!(skill.trim() || name.trim());
  const hasFilters = !!(
    industry.trim()         ||
    minPrice   !== undefined ||
    maxPrice   !== undefined ||
    minRating  !== undefined ||
    minExperience !== undefined ||
    maxExperience !== undefined
  );

  // Path A: Return plain, high-rating profiles if no search parameters exist
  if (!hasQuery && !hasFilters) {
    return getPlainList(pageNum, limitNum, skip);
  }

  try {
    // Resolve name-matched user IDs via regex (only when name term is present)
    let nameMatchedProfileUserIds = null;
    if (name.trim()) {
      const matchingUsers = await userRepository.findUsersByRoleAndNameRegex(
        name.trim(),
        [ROLE_MENTOR],
      );
      nameMatchedProfileUserIds = new Set(matchingUsers.map((u) => u._id.toString()));
    }

    const compound = buildAtlasCompound(skill, industry, minPrice, maxPrice, minRating);
    const expMatch  = buildExperienceMatch(minExperience, maxExperience);

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
      { $match: buildScoreMatchStage(skill, nameMatchedProfileUserIds) },
      {
        $facet: {
          results: [
            { $sort: { searchScore: -1, avgRating: -1 } },
            { $skip: 0 },
            { $limit: ATLAS_PIPELINE_CAP },
            {
              $project: {
                _id: 1, currentRole: 1, industry: 1, company: 1,
                skills: 1, hourlyRate: 1, avgRating: 1, profilePicture: 1,
                linkedInUrl: 1, portfolioUrl: 1, searchScore: 1,
                yearsOfExperience: 1, bio: 1, verificationStatus: 1,
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

    const [facetResult] = await mentorSearchRepository.aggregateMentorProfiles(pipeline);
    let results = facetResult?.results || [];

    results = await mergeNameMatches(results, nameMatchedProfileUserIds, skill, expMatch);

    /*
     * 🧠 CRITICAL FIX:
     * If Atlas search index runs but yields 0 array entries (due to missing autocomplete index mappings),
     * auto-trigger the RegEx fallback calculation loop right here instead of sending back an empty object!
     */
    if (results.length === 0) {
      logger.warn(
        `⚠️ Atlas Search returned 0 hits for term "${skill || name}". Auto-routing request to Regex fallback.`,
      );
      return executeFallbackSearch(queryParams);
    }

    const totalCount  = results.length;
    const totalPages  = Math.ceil(totalCount / limitNum);
    const paginated   = results.slice(skip, skip + limitNum);

    return {
      mentors: paginated.map((m) => ({
        ...toMentorProfileDTO(m),
        searchScore: m.searchScore, // Retains Atlas search relevance metrics
      })),
      pagination: { totalCount, totalPages, currentPage: pageNum, hasMore: pageNum < totalPages },
    };
  } catch (error) {
    // Intercept hardware cluster search exception events cleanly
    if (error.message?.includes("$search") || error.message?.includes("search index")) {
      logger.error(
        `❌ Atlas Search cluster driver mapping fault: ${error.message}. Initializing emergency fallback sequence.`,
      );
      return executeFallbackSearch(queryParams);
    }
    throw error;
  }
};

module.exports = {
  queryMentors,
};
