// config/redis.js
const Redis = require("ioredis");
const logger = require("./logger");
const env = require("./env");

const redis = new Redis(env.redisUrl, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error("Redis error", { error: err.message }));

module.exports = redis;
