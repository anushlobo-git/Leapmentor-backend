/**
 * @fileoverview Google Calendar Integration Validation Schemas
 * @description Intercepts query streams for temporal bounds, ISO date rules,
 * and OAuth code verification strings via celebrate and Joi.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates tracking query parameters incoming from third-party federated callbacks.
 */
const handleCallbackValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    code: Joi.string().trim().optional(),
    state: Joi.string().trim().optional(),
    error: Joi.string().trim().optional(),
  }).or("code", "error"),
});

/**
 * Validates temporal ranges before triggering calendar aggregations.
 */
const getCalendarIntervalValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    startDate: Joi.string().regex(dateRegex).required().messages({
      "string.pattern.base":
        "startDate must strictly comply with the continuous YYYY-MM-DD text format specification.",
      "any.required": "startDate query string parameter is required.",
    }),
    endDate: Joi.string().regex(dateRegex).required().messages({
      "string.pattern.base":
        "endDate must strictly comply with the continuous YYYY-MM-DD text format specification.",
      "any.required": "endDate query string parameter is required.",
    }),
  }),
});

module.exports = {
  handleCallbackValidation,
  getCalendarIntervalValidation,
};
