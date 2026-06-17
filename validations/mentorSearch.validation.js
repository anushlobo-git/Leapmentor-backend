const { Joi, Segments, celebrate } = require("celebrate");

const searchMentorsValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    // Pagination & Bounds
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(20).default(4),

    // Core Search Term
    skill: Joi.string().trim().lowercase().allow("").default(""),
  }).unknown(true), // 👈 This allows other filters to pass through safely without crashing the API
});

module.exports = { searchMentorsValidation };
