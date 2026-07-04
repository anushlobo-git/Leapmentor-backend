/**
 * @fileoverview Service Layer for Mentor Discovery and Search Operations.
 * Handles high-performance Atlas Search queries with structural regex fallbacks,
 * facet-based pagination, and autocomplete compilation utilities via parameter injection.
 */

const AppError = require("../utils/AppError");

const ROLE_MENTOR = "mentor";
const ATLAS_SEARCH_INDEX = "mentor_search";
const DEFAULT_PAGE_MINIMUM = 1;
const CONFIG_MAX_LIMIT = 20;
const CONFIG_DEFAULT_LIMIT = 6;
const EXTRA_NAME_MATCH_SCORE = 2;

/** Profiles visible in search: complete and not explicitly unpublished. */
const SEARCHABLE_FILTER = {
  isProfileComplete: true,
  isProfilePublished: { $ne: false },
};

const createMentorSearchService = ({
  mentorSearchRepository,
  userRepository,
  toMentorProfileDTO,
  logger,
}) => {
  /**
   * Builds a standardized pagination payload for search responses.
   * @private
   */
  const _buildPaginationResponse = (
    pageNum,
    limitNum,
    skip,
    totalCount,
    mentors,
  ) => ({
    mentors,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      hasMore: skip + mentors.length < totalCount,
    },
  });

  /**
   * Retrieves a simple, unfiltered list of published mentors sorted by rating.
   * @private
   */
  const _getPlainList = async (pageNum, limitNum, skip) => {
    const [totalCount, mentors] = await Promise.all([
      mentorSearchRepository.countMentorProfiles(SEARCHABLE_FILTER),
      mentorSearchRepository.findMentorsWithUserPopulation(
        SEARCHABLE_FILTER,
        { avgRating: -1 },
        skip,
        limitNum,
      ),
    ]);

    return _buildPaginationResponse(
      pageNum,
      limitNum,
      skip,
      totalCount,
      mentors.map(toMentorProfileDTO),
    );
  };

  /**
   * Fallback query runner utilizing standard database regular expressions.
   */
  const executeFallbackSearch = async (queryParams) => {
    logger.info(
      "🔍 Initiating Database Regex Fallback Search Execution Engine",
    );

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

    const filter = { ...SEARCHABLE_FILTER };
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

    return _buildPaginationResponse(
      pageNum,
      limitNum,
      skip,
      totalCount,
      mentors.map(toMentorProfileDTO),
    );
  };

  /**
   * Parses and clamps page + limit query parameters into safe integers.
   * @private
   */
  const _parsePagination = (page, limit) => {
    const pageNum = Math.max(DEFAULT_PAGE_MINIMUM, Number.parseInt(page, 10));
    const limitNum = Math.min(
      CONFIG_MAX_LIMIT,
      Math.max(DEFAULT_PAGE_MINIMUM, Number.parseInt(limit, 10)),
    );
    return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
  };

  /**
   * Validates that minPrice does not exceed maxPrice when both are supplied.
   * @private
   */
  const _validatePriceRange = (minPrice, maxPrice) => {
    if (minPrice === undefined || maxPrice === undefined) return;
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      throw new AppError("minPrice cannot exceed maxPrice.", 400);
    }
  };

  /**
   * Builds the Atlas Search compound object (filter / must / should clauses).
   * @private
   */
  const _buildAtlasCompound = (
    skill,
    industry,
    minPrice,
    maxPrice,
    minRating,
  ) => {
    const filterClauses = [
      { equals: { path: "isProfileComplete", value: true } },
    ];
    const mustClauses = [];
    const shouldClauses = [];

    if (skill.trim()) {
      shouldClauses.push(
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

    const compound = {
      filter: filterClauses,
      mustNot: [{ equals: { path: "isProfilePublished", value: false } }],
    };
    if (mustClauses.length > 0) compound.must = mustClauses;
    if (shouldClauses.length > 0) {
      compound.should = shouldClauses;
      compound.minimumShouldMatch = 1;
    }

    if (mustClauses.length === 0 && shouldClauses.length === 0) {
      compound.must = [{ equals: { path: "isProfileComplete", value: true } }];
    }

    return compound;
  };

  /**
   * Builds the post-search $match stage for experience range filtering.
   * @private
   */
  const _buildExperienceMatch = (minExperience, maxExperience) => {
    if (minExperience === undefined && maxExperience === undefined) return {};
    const yearsOfExperience = {};
    if (minExperience !== undefined)
      yearsOfExperience.$gte = Number(minExperience);
    if (maxExperience !== undefined)
      yearsOfExperience.$lte = Number(maxExperience);
    return { yearsOfExperience };
  };

  /**
   * Resolves the $match filter stage used after $unwind in the Atlas pipeline.
   * @private
   */
  const _buildScoreMatchStage = (skill) => {
    if (skill.trim()) return { searchScore: { $gt: 0 } };
    return {};
  };

  /**
   * Shared Atlas pipeline stages before lookup/facet branching.
   * @private
   */
  const _buildAtlasPreLookupStages = (compound, expMatch, skill) => [
    { $search: { index: ATLAS_SEARCH_INDEX, compound } },
    { $addFields: { searchScore: { $meta: "searchScore" } } },
    ...(Object.keys(expMatch).length > 0 ? [{ $match: expMatch }] : []),
    { $match: _buildScoreMatchStage(skill) },
  ];

  /**
   * Projection stage for mentor search result documents.
   * @private
   */
  const _buildResultProjection = () => ({
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
  });

  /**
   * Fetches mentor profiles for name matches absent from Atlas results.
   * @private
   */
  const _fetchNameOnlyProfiles = async (
    missingIds,
    expMatch,
    limit = CONFIG_MAX_LIMIT,
  ) => {
    if (missingIds.length === 0) return [];

    const extraFilter = {
      user: { $in: missingIds },
      ...SEARCHABLE_FILTER,
      ...expMatch,
    };

    return mentorSearchRepository.findMentorsWithUserPopulation(
      extraFilter,
      { avgRating: -1 },
      0,
      limit,
    );
  };

  /**
   * Resolves name-only extras and Atlas pagination offsets when name is provided.
   * @private
   */
  const _resolveNameMergeContext = async ({
    nameMatchedProfileUserIds,
    compound,
    expMatch,
    skill,
    pageNum,
    limitNum,
  }) => {
    if (!nameMatchedProfileUserIds || nameMatchedProfileUserIds.size === 0) {
      return {
        extraProfiles: [],
        extrasOnFirstPage: 0,
        atlasSkip: (pageNum - 1) * limitNum,
        atlasLimit: limitNum,
        extraCount: 0,
      };
    }

    const atlasUserDocs = await mentorSearchRepository.aggregateMentorProfiles([
      ..._buildAtlasPreLookupStages(compound, expMatch, skill),
      { $project: { user: 1 } },
    ]);
    const atlasUserIds = new Set(
      atlasUserDocs.map((doc) => doc.user.toString()),
    );

    const missingIds = [...nameMatchedProfileUserIds].filter(
      (id) => !atlasUserIds.has(id),
    );
    const extraProfiles = await _fetchNameOnlyProfiles(missingIds, expMatch);
    const extraCount = extraProfiles.length;

    if (!skill.trim()) {
      return {
        extraProfiles,
        extrasOnFirstPage: 0,
        atlasSkip: (pageNum - 1) * limitNum,
        atlasLimit: limitNum,
        extraCount,
        nameOnly: true,
      };
    }

    const extrasOnFirstPage = Math.min(extraCount, limitNum);
    const atlasSkip =
      pageNum === 1 ? 0 : (pageNum - 1) * limitNum - extrasOnFirstPage;
    const atlasLimit =
      pageNum === 1 ? Math.max(0, limitNum - extrasOnFirstPage) : limitNum;

    return {
      extraProfiles,
      extrasOnFirstPage,
      atlasSkip: Math.max(0, atlasSkip),
      atlasLimit,
      extraCount,
      nameOnly: false,
    };
  };

  /**
   * Merges name-matched mentor profiles into Atlas Search results for the current page.
   * @private
   */
  const _mergeNameMatchesForPage = (
    results,
    extraProfiles,
    nameMatchedProfileUserIds,
    skill,
    pageNum,
    extrasOnFirstPage,
  ) => {
    if (!nameMatchedProfileUserIds || nameMatchedProfileUserIds.size === 0) {
      return results;
    }

    let merged = results;

    if (skill.trim() && pageNum === 1 && extraProfiles.length > 0) {
      const withScore = extraProfiles.slice(0, extrasOnFirstPage).map((p) => ({
        ...p,
        searchScore: EXTRA_NAME_MATCH_SCORE,
        user: { _id: p.user._id, name: p.user.name, email: p.user.email },
      }));
      merged = [...withScore, ...results];
    }

    if (!skill.trim()) {
      merged = merged.filter((r) =>
        nameMatchedProfileUserIds.has(r.user._id.toString()),
      );
    }

    return merged;
  };

  /**
   * Searches and filters mentor registries via unified MongoDB Atlas indexing.
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

    const { pageNum, limitNum, skip } = _parsePagination(page, limit);

    _validatePriceRange(minPrice, maxPrice);

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
      return _getPlainList(pageNum, limitNum, skip);
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

      const compound = _buildAtlasCompound(
        skill,
        industry,
        minPrice,
        maxPrice,
        minRating,
      );
      const expMatch = _buildExperienceMatch(minExperience, maxExperience);

      const nameMergeContext = await _resolveNameMergeContext({
        nameMatchedProfileUserIds,
        compound,
        expMatch,
        skill,
        pageNum,
        limitNum,
      });

      const pipeline = [
        ..._buildAtlasPreLookupStages(compound, expMatch, skill),
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
          $facet: {
            metadata: [{ $count: "total" }],
            results: [
              { $sort: { searchScore: -1, avgRating: -1 } },
              { $skip: nameMergeContext.atlasSkip },
              { $limit: nameMergeContext.atlasLimit },
              _buildResultProjection(),
            ],
          },
        },
      ];

      const [facetResult] =
        await mentorSearchRepository.aggregateMentorProfiles(pipeline);
      const atlasTotalCount = facetResult?.metadata?.[0]?.total ?? 0;
      let results = facetResult?.results || [];

      results = _mergeNameMatchesForPage(
        results,
        nameMergeContext.extraProfiles,
        nameMatchedProfileUserIds,
        skill,
        pageNum,
        nameMergeContext.extrasOnFirstPage,
      );

      if (results.length === 0) {
        logger.warn(
          `⚠️ Atlas Search returned 0 hits for term "${skill || name}". Auto-routing request to Regex fallback.`,
        );
        return executeFallbackSearch(queryParams);
      }

      let totalCount = atlasTotalCount;
      if (nameMatchedProfileUserIds && nameMatchedProfileUserIds.size > 0) {
        if (!skill.trim()) {
          totalCount = await mentorSearchRepository.countMentorProfiles({
            user: { $in: [...nameMatchedProfileUserIds] },
            ...SEARCHABLE_FILTER,
            ...expMatch,
          });
        } else {
          totalCount = atlasTotalCount + nameMergeContext.extraCount;
        }
      }

      const paginated = results.slice(0, limitNum);

      return _buildPaginationResponse(
        pageNum,
        limitNum,
        skip,
        totalCount,
        paginated.map((m) => ({
          ...toMentorProfileDTO(m),
          searchScore: m.searchScore,
        })),
      );
    } catch (error) {
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

  return {
    queryMentors,
    executeFallbackSearch,
  };
};

module.exports = createMentorSearchService;
