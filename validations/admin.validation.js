/**
 * @fileoverview Administrative Actions Request Validation Schemas
 * @description Validates incoming request payloads, query variables, and path parameters
 * to ensure data cleanliness before execution enters controllers.
 * @module validations/admin
 */

const { celebrate, Joi, Segments } = require("celebrate");

// Regular Expression to match standard 24-character hexadecimal Mongoose ObjectIds
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Validation middleware for administrative credentials check.
 */
const adminLoginValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Administrative email address is required.",
      "string.email": "Please provide a valid email structure.",
      "any.required": "Administrative email address is required.",
    }),

    password: Joi.string().min(8).required().messages({
      "string.empty": "Password verification field is required.",
      "string.min": "Password must be at least 8 characters long.",
      "any.required": "Password verification field is required.",
    }),
  }),
});

/**
 * Validation middleware for query string parsing on user ledgers.
 */
const getUsersQueryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    search: Joi.string().trim().allow("").optional(),
    role: Joi.string().valid("mentor", "mentee").optional().messages({
      "any.only": "Role filters are restricted to 'mentor' or 'mentee' values.",
    }),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    deleted: Joi.string().valid("true", "false").optional(),
  }),
});

/**
 * Validation middleware for connection engagement historical logs.
 */
const getEngagementsQueryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    status: Joi.string()
      .valid(
        "pending",
        "accepted",
        "rejected",
        "referred",
        "ongoing",
        "completed",
      )
      .optional(),
    search: Joi.string().trim().allow("").optional(),
    dateFrom: Joi.string().isoDate().allow("").optional().messages({
      "string.isoDate":
        "Starting lookup date boundary must follow a valid ISO-8601 standard.",
    }),
    dateTo: Joi.string().isoDate().allow("").optional().messages({
      "string.isoDate":
        "Ending lookup date boundary must follow a valid ISO-8601 standard.",
    }),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(15).optional(),
  }),
});

/**
 * Validation middleware enforcing strict hexadecimal identification constraints on path routes.
 */
const userIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    userId: Joi.string().regex(MONGO_OBJECT_ID_REGEX).required().messages({
      "string.pattern.base":
        "Provided user identification path parameter is structurally invalid.",
      "any.required": "User routing identifier parameter is required.",
    }),
  }),
});

module.exports = {
  adminLoginValidation,
  getUsersQueryValidation,
  getEngagementsQueryValidation,
  userIdParamValidation,
};
