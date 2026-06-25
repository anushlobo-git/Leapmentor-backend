/**
 * @fileoverview Escrow Request Validation Schemas
 * @description Intercepts incoming network payloads across financial gates
 * ensuring clean token metrics, item bounds, and valid hex BSON object IDs.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates initialization payload metrics for locking standard escrow contracts.
 */
const payValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Invalid connection reference identification token format.",
      "string.empty": "connectRequestId is required",
      "any.required": "connectRequestId is required",
    }),
    sessionRate: Joi.number().integer().min(1).required().messages({
      "number.base":
        "sessionRate must evaluate to a valid integer number track.",
      "number.min": "sessionRate must be at least 1",
      "any.required": "sessionRate is required",
    }),
    sessionCount: Joi.number().integer().min(1).required().messages({
      "number.base":
        "sessionCount must evaluate to a valid integer number track.",
      "number.min": "sessionCount must be at least 1",
      "any.required": "sessionCount is required",
    }),
  }),
});

/**
 * Validates inputs when purchasing individual session blocks on active lines.
 */
const payAdditionalValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Invalid connection reference identification token format.",
      "any.required": "connectRequestId is required",
    }),
    sessionRate: Joi.number().integer().min(1).required().messages({
      "number.min": "sessionRate must be at least 1",
      "any.required": "sessionRate is required",
    }),
    slotId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Invalid target sub-slot structural identifier key format.",
      "string.empty": "slotId is required",
      "any.required": "slotId is required",
    }),
  }),
});

/**
 * Intercepts request paths matching unique connection record parameters.
 */
const escrowRequestIdParamsValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    requestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The parsed context identifier parameters must match valid ObjectId keys.",
      "any.required":
        "Target resource requestId configuration parameter is required.",
    }),
  }),
});

module.exports = {
  payValidation,
  payAdditionalValidation,
  escrowRequestIdParamsValidation,
};
