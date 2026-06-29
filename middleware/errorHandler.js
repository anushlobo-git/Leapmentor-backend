const logger = require("../config/logger");
const env = require("../config/env");
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Something went wrong";

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    status: statusCode,
    url: req.originalUrl,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
