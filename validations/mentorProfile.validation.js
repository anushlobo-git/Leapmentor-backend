/**
 * @fileoverview Mentor Profile Request Validation Schemas
 * @description Configures fail-fast query parameter validations using celebrate and Joi.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates initialization parameters when provisioning a fresh profile during onboarding.
 * @route POST /api/v1/mentor-profile
 */
const createProfileValidation = celebrate({
  [Segments.BODY]: Joi.object({
    currentRole: Joi.string().trim().max(100).required().messages({
      "string.empty": "Current professional role statement is required.",
      "any.required": "Current professional role configuration is required.",
    }),
    industry: Joi.string().trim().max(100).required().messages({
      "string.empty": "Industry domain sector field is required.",
      "any.required": "Industry domain specification is required.",
    }),
    company: Joi.string().trim().max(100).allow("").optional(),
    bio: Joi.string().trim().max(2000).required().messages({
      "string.empty": "Professional summary biography is required.",
      "string.max": "Biography cannot exceed 2000 characters.",
    }),
    profilePicture: Joi.string().trim().uri().allow("").optional(),
    yearsOfExperience: Joi.number().integer().min(0).max(50).optional(),
    hourlyRate: Joi.number().min(0).optional(),
    skills: Joi.array().items(Joi.string().trim()).min(1).required().messages({
      "array.min":
        "At least one target core skill capability must be specified.",
    }),
    communicationPreferences: Joi.array().items(Joi.string().trim()).optional(),
    languages: Joi.array().items(Joi.string().trim()).optional(),
    linkedInUrl: Joi.string().trim().uri().allow("").optional(),
    portfolioUrl: Joi.string().trim().uri().allow("").optional(),
  }),
});

/**
 * Validates dynamic update blocks during profile modifications.
 * @route PUT /api/v1/mentor-profile/me
 */
const updateProfileValidation = celebrate({
  [Segments.BODY]: Joi.object({
    currentRole: Joi.string().trim().max(100).optional(),
    industry: Joi.string().trim().max(100).optional(),
    company: Joi.string().trim().max(100).allow("").optional(),
    bio: Joi.string().trim().max(2000).optional(),
    profilePicture: Joi.string().trim().uri().allow("").optional(),
    yearsOfExperience: Joi.number().integer().min(0).max(50).optional(),
    hourlyRate: Joi.number().min(0).optional(),
    skills: Joi.array().items(Joi.string().trim()).min(1).optional(),
    communicationPreferences: Joi.array().items(Joi.string().trim()).optional(),
    languages: Joi.array().items(Joi.string().trim()).optional(),
    linkedInUrl: Joi.string().trim().uri().allow("").optional(),
    portfolioUrl: Joi.string().trim().uri().allow("").optional(),
  }),
});

/**
 * Validates public profile lookups via route parameters.
 * @route GET /api/v1/mentor-profile/:id
 */
const mentorIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The path target parameter must match a valid 24-character hex ObjectId layout.",
    }),
  }),
});

module.exports = {
  createProfileValidation,
  updateProfileValidation,
  mentorIdParamValidation,
};
