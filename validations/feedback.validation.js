/**
 * @fileoverview Peer Feedback Route Request Validation Schemas
 * @description Intercepts incoming client interaction scores ensuring integer ranges,
 * safe text comments length controls, and structured MongoDB BSON ObjectId verification.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema rules when posting a brand-new assessment score.
 * @route POST /api/v1/feedback
 */
const createFeedbackValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Invalid connectRequestId context format configuration key.",
      "any.required":
        "connectRequestId parameter identification reference is required.",
    }),
    rating: Joi.number().integer().min(1).max(5).required().messages({
      "number.base": "Rating must evaluate to a valid integer numeric value.",
      "number.min": "Rating must be at least 1.",
      "number.max": "Rating cannot be greater than 5.",
      "any.required": "Rating score assessment parameter field is required.",
    }),
    comment: Joi.string().trim().max(1000).allow("").optional().messages({
      "string.max":
        "Comment details tracking string cannot exceed a length constraint of 1000 characters.",
    }),
    slotIndex: Joi.number().integer().min(0).optional().messages({
      "number.base":
        "Slot index tracking metric parameter must evaluate to an integer numerical value.",
    }),
  }),
});

/**
 * Validation schema rules when requesting historical connection logs feedback.
 * @route GET /api/v1/feedback/:connectRequestId
 */
const getFeedbackValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The path parameters identifier must match a valid ObjectId hex string key.",
      "any.required":
        "The target connectRequestId routing query parameter path field is required.",
    }),
  }),
});

module.exports = {
  createFeedbackValidation,
  getFeedbackValidation,
};
