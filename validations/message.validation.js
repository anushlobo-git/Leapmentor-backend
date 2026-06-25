/**
 * @fileoverview Message Request Validation Schemas
 * @description Configures declarative payload gates for chat history pagination
 * and message threads using celebrate and Joi parameters constraints.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for paginated chat history lookups.
 * @route GET /api/v1/messages/:connectRequestId
 */
const getMessagesValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "connectRequestId must match a valid 24-character hex ObjectId string layout.",
      "any.required": "connectRequestId path parameter identifier is required.",
    }),
  }),
  [Segments.QUERY]: Joi.object({
    page: Joi.number().integer().min(1).optional().messages({
      "number.base":
        "Page reference parameter index must evaluate to a valid integer number.",
      "number.min": "Page parameter routing index must be at least 1.",
    }),
    limit: Joi.number().integer().min(1).max(50).optional().messages({
      "number.base":
        "Limit size configuration parameter must evaluate to an integer number.",
      "number.min": "Limit configuration must specify at least 1 item row.",
      "number.max":
        "Limit constraint parameter cannot exceed a maximum threshold of 50 items per page.",
    }),
  }),
});

/**
 * Validation schema for checking room-specific unread counters.
 * @route GET /api/v1/messages/:connectRequestId/unread
 */
const getUnreadCountValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "connectRequestId must match a valid 24-character hex ObjectId string layout.",
      "any.required": "connectRequestId path parameter identifier is required.",
    }),
  }),
});

module.exports = {
  getMessagesValidation,
  getUnreadCountValidation,
};
