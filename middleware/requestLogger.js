// middleware/requestLogger.js
const logger = require("../config/logger");

const requestLogger = (req, res, next) => {
  const start = Date.now();

  logger.info("API Request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.on("finish", () => {
    logger.info("API Response", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
};

module.exports = requestLogger;
