// utils/cache.js
const redisClient = require("../config/redis");
const logger = require("../config/logger");

/**
 * Standardized Caching Utility
 */
const getOrSetCache = async (key, ttl, fetchFunction) => {
  // 1. Try to fetch from cache
  const cachedData = await redisClient.get(key);
  if (cachedData) {
    logger.info(`⚡ Cache HIT | Key: ${key}`);
    return JSON.parse(cachedData);
  }

  // 2. Cache Miss: Execute the database function passed as an argument
  logger.info(`🐢 Cache MISS | Key: ${key}`);
  const data = await fetchFunction();

  // 3. Store in cache
  await redisClient.set(key, JSON.stringify(data), "EX", ttl);

  return data;
};

module.exports = { getOrSetCache };
