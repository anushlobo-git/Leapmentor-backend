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

  const pageNum = Math.max(DEFAULT_PAGE_MINIMUM, parseInt(page, 10));
  const limitNum = Math.min(
    CONFIG_MAX_LIMIT,
    Math.max(DEFAULT_PAGE_MINIMUM, parseInt(limit, 10)),
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
 * Searches and filters mentor registries via unified MongoDB Atlas indexing.
 * Includes auto-reverting fallback routes to eliminate blank responses.
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
      throw new AppError("minPrice cannot exceed maxPrice.", 400);
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

  // Path A: Return plain, high-rating profiles if no search parameters exist
  if (!hasQuery && !hasFilters) {
    return getPlainList(pageNum, limitNum, skip);
  }

  try {
    let nameMatchedProfileUserIds = null;
    if (name.trim()) {
      const matchingUsers = await userRepository.findUsersByRoleAndNameRegex(
        name.trim(),
        [ROLE_MENTOR],
      );
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
    // Intercept hardware cluster search exception events cleanly
    if (
      error.message?.includes("$search") ||
      error.message?.includes("search index")
    ) {
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
