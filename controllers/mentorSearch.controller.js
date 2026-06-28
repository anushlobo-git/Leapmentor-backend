/**
 * @fileoverview Mentor Search and Discovery Domain Controller
 * @description Decoupled transport boundary compiling query filters cache matrices
 * and routing operations down to stateless query search service layers via injection.
 */

const catchAsync = require("../utils/catchAsync");

/**
 * Builds a deterministic cache key from all query parameters.
 * Sorts keys so ?skill=react&page=1 and ?page=1&skill=react hit the same cache.
 */
const buildCacheKey = ( query ) => {
  const normalized = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}:${String(value).trim().toLowerCase()}`)
    .sort((a, b) => a.localeCompare(b))
    .join("|");

  return `cache:mentors:${normalized || "all"}`;
};

const createMentorSearchController = ({mentorSearchService, cacheUtility}) => {
  /**
   * Searches and filters across platform mentor registrations with standardized Cache-Aside utility hooks.
   * @route   GET /api/v1/mentors/search
   * @access  Private (Mentee Only)
   */
  const searchMentors = catchAsync(async (req, res, next) => {
    const cacheKey = buildCacheKey(req.query);

    const result = await cacheUtility.getOrSetCache(cacheKey, 300, async () => {
      return await mentorSearchService.queryMentors(req.query);
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  });

  return {
    searchMentors,
  };
};

module.exports = createMentorSearchController;
