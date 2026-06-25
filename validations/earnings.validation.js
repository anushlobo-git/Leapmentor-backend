/**
 * @fileoverview Mentor Earnings Route Request Validation Schemas
 * @description Utilizes celebrate and Joi to intercept and validate incoming query
 * string parameters before processing reaches the financial controllers.
 */

const { celebrate, Joi, Segments } = require("celebrate");

/**
 * Validation schema for the earnings trend timeline charts.
 * @route GET /api/v1/earnings/chart
 */
const getEarningsChartValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    period: Joi.string().valid("weekly", "monthly").optional().messages({
      "any.only":
        "Period timeline strategy constraint must be either 'weekly' or 'monthly'.",
    }),
  }),
});

/**
 * Validation schema for paginated audit logs.
 * @route GET /api/v1/earnings/payouts
 */
const getPayoutHistoryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().integer().min(1).optional().messages({
      "number.base":
        "Page reference parameter must evaluate to a valid integer number.",
      "number.min": "Page routing index must be at least 1.",
    }),
    limit: Joi.number().integer().min(1).max(20).optional().messages({
      "number.base":
        "Limit size volume configuration parameter must be an integer number.",
      "number.min": "Limit parameter must specify at least 1 item row.",
      "number.max":
        "Limit constraint parameter cannot exceed a maximum capacity of 20 items per page.",
    }),
    search: Joi.string().trim().allow("").optional(),
  }),
});

module.exports = {
  getEarningsChartValidation,
  getPayoutHistoryValidation,
};
