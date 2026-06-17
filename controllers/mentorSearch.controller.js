const catchAsync = require("../utils/catchAsync");
const mentorSearchService = require("../services/mentorSearch.service");
const logger = require("../config/logger");
const redisClient = require("../config/redis"); // 1. Import your existing Redis client

/**
 * Searches and filters across platform mentor registrations with Redis caching.
 * @route   GET /api/v1/mentors/search
 * @access  Private (Mentee Only)
 */
const searchMentors = catchAsync(async (req, res) => {
  const { skill, limit } = req.query;

  // 2. Generate the unique, dynamic cache key
  const cacheKey = `cache:mentors:${skill.trim().toLowerCase()}:limit:${limit}`;

  // 3. Try to fetch from Redis cache first
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    logger.info(
      `⚡ Cache HIT | Data retrieved from Redis for key: ${cacheKey}`,
    );
    return res.status(200).json({
      success: true,
      ...JSON.parse(cachedData), // Convert string back to JSON object
    });
  }

  logger.info(
    `🐢 Cache MISS | Fetching search results from MongoDB for key: ${cacheKey}`,
  );

  // 4. Cache Miss: Query the heavy database pipeline
  const result = await mentorSearchService.queryMentors(req.query);

  // 5. Store the fresh result in Redis with a 5-minute (300 seconds) expiration TTL
  await redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  searchMentors,
};
