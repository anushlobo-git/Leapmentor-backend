/**
 * @fileoverview Leap Request Actions Request Validation Schemas
 * @description Validates incoming request queries and path parameters for Leap Requests
 * to guarantee data integrity before execution hits the controller tier.
 * @module validations/leapRequest
 */

const { celebrate, Joi, Segments } = require("celebrate");

// Regular Expression matching standard 24-character hexadecimal Mongoose ObjectIds
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for the filtered administrative leap request ledger.
 */
const getAllLeapRequestsQueryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    status: Joi.string()
      .valid("pending", "approved", "rejected")
      .optional()
      .messages({
        "any.only":
          "Status filter must match 'pending', 'approved', or 'rejected' states.",
      }),
  }),
});

/**
 * Validation schema enforcing precise MongoDB Hex IDs on target request parameters.
 */
const leapRequestIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(MONGO_OBJECT_ID_REGEX).required().messages({
      "string.pattern.base":
        "The provided request routing identification parameter is structurally invalid.",
      "any.required": "The unique request routing parameter key is required.",
    }),
  }),
});

module.exports = {
  getAllLeapRequestsQueryValidation,
  leapRequestIdParamValidation,
};
