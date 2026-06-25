/**
 * @fileoverview Mentee Profile Request Validation Schemas
 * @description Utilizes celebrate and Joi to filter and sanitize onboarding payloads,
 * experience metrics, and standard MongoDB hex ObjectId route keys.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates initialization parameters when provisioning a fresh profile during onboarding.
 * @route POST /api/v1/mentee-profile
 */
const createProfileValidation = celebrate({
  [Segments.BODY]: Joi.object({
    currentRole: Joi.string().trim().max(100).required().messages({
      "string.empty": "Current professional role statement is required.",
      "any.required": "Current professional role configuration is required.",
    }),
    industry: Joi.string().trim().max(100).required().messages({
      "string.empty": "Target industry domain parameter field is required.",
    }),
    company: Joi.string().trim().max(100).allow("").optional(),
    yearsOfExperience: Joi.number().integer().min(0).max(50).optional(),
    bio: Joi.string().trim().max(2000).required().messages({
      "string.max": "Biographical summary information track cannot exceed 2000 characters.",
    }),
    profilePicture: Joi.string().trim().uri().allow("").optional(),
    linkedInUrl: Joi.string().trim().uri().allow("").optional(),
    portfolioUrl: Joi.string().trim().uri().allow("").optional(),
    skills: Joi.array().items(Joi.string().trim()).min(1).required().messages({
      "array.min": "At least one distinct functional skill element must be supplied.",
    }),
    interestedFields: Joi.array().items(Joi.string().trim()).min(1).required(),
    communicationPreferences: Joi.array().items(Joi.string().trim()).optional(),
    languages: Joi.array().items(Joi.string().trim()).optional(),
  }),
});

/**
 * Validates dynamic update blocks during profile modifications.
 * @route PUT /api/v1/mentee-profile/me
 */
const updateProfileValidation = celebrate({
  [Segments.BODY]: Joi.object({
    currentRole: Joi.string().trim().max(100).optional(),
    industry: Joi.string().trim().max(100).optional(),
    company: Joi.string().trim().max(100).allow("").optional(),
    yearsOfExperience: Joi.string().trim().min(0).max(50).optional(),
    bio: Joi.string().trim().max(2000).optional(),
    profilePicture: Joi.string().trim().uri().allow("").optional(),
    linkedInUrl: Joi.string().trim().uri().allow("").optional(),
    portfolioUrl: Joi.string().trim().uri().allow("").optional(),
    skills: Joi.array().items(Joi.string().trim()).min(1).optional(),
    interestedFields: Joi.array().items(Joi.string().trim()).min(1).optional(),
    communicationPreferences: Joi.array().items(Joi.string().trim()).optional(),
    languages: Joi.array().items(Joi.string().trim()).optional(),
  }),
});

/**
 * Validates public profile lookups via route parameters.
 * @route GET /api/v1/mentee-profile/:id
 */
const menteeIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base": "The path target variable must match a structurally valid 24-character hex ObjectId.",
    }),
  }),
});

module.exports = {
  createProfileValidation,
  updateProfileValidation,
  menteeIdParamValidation,
};