const catchAsync = require("../utils/catchAsync");
const mentorSearchService = require("../services/mentorSearch.service");
const logger = require("../config/logger");
const redisClient = require("../config/redis");

/**
 * Builds a deterministic cache key from all query parameters.
 * Sorts keys so ?skill=react&page=1 and ?page=1&skill=react hit the same cache.
 */
const buildCacheKey = (query) => {
  const normalized = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}:${String(value).trim().toLowerCase()}`)
    .sort() // ← sort so param order doesn't create duplicate keys
    .join("|");

  return `cache:mentors:${normalized || "all"}`;
};

/**
 * Searches and filters across platform mentor registrations with Redis caching.
 * @route   GET /api/v1/mentors/search
 * @access  Private (Mentee Only)
 */
const searchMentors = catchAsync(async (req, res) => {
  const cacheKey = buildCacheKey(req.query);

  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    logger.info(`⚡ Cache HIT | ${cacheKey}`);
    return res.status(200).json({
      success: true,
      ...JSON.parse(cachedData),
    });
  }

  logger.info(`🐢 Cache MISS | ${cacheKey}`);

  const result = await mentorSearchService.queryMentors(req.query);

  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = { searchMentors };
