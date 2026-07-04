/**
 * @fileoverview Centralized API Response Handler
 * @description Single source of truth for all HTTP response shapes across the app.
 * Every controller should use these instead of calling res.json() directly.
 * Mirrors the shape produced by middlewares/errorHandler.js for thrown errors,
 * so the frontend always receives one consistent envelope regardless of path.
 */

const env = require("../config/env");

// Standard HTTP status codes, named for readability in controllers
const STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
};

/**
 * Send a success response.
 * @param {Response} res - Express response object
 * @param {*} data - Payload to return (object, array, or null)
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (
  res,
  data = null,
  message = "Success",
  statusCode = STATUS.OK,
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

/**
 * Send an error response.
 * Use this for controller-level errors you want to send manually
 * (e.g. inline validation) without throwing and going through errorHandler.js.
 *
 * @param {Response} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {*} error - Optional structured error details (field errors, error code, etc.)
 * @param {string} [stack] - Optional stack trace, only ever attached in development
 */
const sendError = (
  res,
  message = "Something went wrong",
  statusCode = STATUS.SERVER_ERROR,
  error = null,
  stack = null,
) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error,
    ...(env.nodeEnv === "development" && stack && { stack }),
  });
};

module.exports = { sendSuccess, sendError, STATUS };
