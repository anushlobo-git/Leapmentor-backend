/**
 * @fileoverview Standardized Caching Utility
 * @description Provides guarded Cache-Aside mechanics and cache eviction wrapped in a factory closure.
 * Gracefully downgrades to database lookups or bypasses if the caching infrastructure fails.
 */

const createCacheUtility = (redisClient, logger) => {
  /**
   * Retrieves data from cache or falls back to database execution targets.
   * @param {string} key           - Unique identifier layout string for cache indexing.
   * @param {number} ttl           - Time-To-Live validation duration in seconds.
   * @param {Function} fetchFunction - Asynchronous callback executed on cache misses.
   * @returns {Promise<any>} Mapped payload data results.
   */
  const getOrSetCache = async (key, ttl, fetchFunction) => {
    let cachedData;

    // 1. Guarded Cache Read Boundary
    try {
      cachedData = await redisClient.get(key);
    } catch (redisError) {
      logger.error(
        `🚨 Redis connection failure on GET | Key: ${key} | Error: ${redisError.message}`,
      );
    }

    if (cachedData) {
      logger.info(`⚡ Cache HIT | Key: ${key}`);
      try {
        return JSON.parse(cachedData);
      } catch (parseError) {
        logger.error(
          `⚠️ Cache corruption detected on JSON parsing | Key: ${key}`,
        );
        await redisClient.del(key).catch(() => {}); // Clean up bad data silently
      }
    }

    // 2. Cache Miss: Execute fallback data pipeline operation
    logger.info(`🐢 Cache MISS | Key: ${key}`);
    const data = await fetchFunction();

    // 3. Guarded Cache Write Boundary
    if (data !== undefined && data !== null) {
      try {
        await redisClient.set(key, JSON.stringify(data), "EX", ttl);
      } catch (redisError) {
        logger.error(
          `🚨 Redis connection failure on SET | Key: ${key} | Error: ${redisError.message}`,
        );
      }
    }

    return data;
  };

  /**
   * Explicitly purges a specified tracking index from the Redis cluster.
   * Ensures the system degrades gracefully without throwing unhandled runtime exceptions if Redis is down.
   * @param {string} key - Target index key to delete.
   * @returns {Promise<void>}
   */
  const evictCache = async (key) => {
    try {
      await redisClient.del(key);
      logger.info(`♻️ Cache EVICT | Key: ${key}`);
    } catch (redisError) {
      logger.error(
        `🚨 Redis connection failure on DEL | Key: ${key} | Error: ${redisError.message}`,
      );
    }
  };

  return {
    getOrSetCache,
    evictCache,
  };
};

module.exports = createCacheUtility;
