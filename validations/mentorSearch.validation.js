/**
 * @fileoverview Mentor Discovery Search Validation Schemas
 * @description Intercepts and parses text strings, cost metrics, numeric ranges,
 * and page thresholds using celebrate and Joi constraints.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const searchMentorsValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    skill: Joi.string().trim().allow("").optional(),
    name: Joi.string().trim().allow("").optional(),
    industry: Joi.string().trim().allow("").optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    minRating: Joi.number().min(0).max(5).optional(),
    minExperience: Joi.number().integer().min(0).optional(),
    maxExperience: Joi.number().integer().min(0).optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(20).optional().default(6),
  }),
});

module.exports = {
  searchMentorsValidation,
};
