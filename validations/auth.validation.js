/**
 * @fileoverview Authentication Request Validation Schemas
 * @description  Validates incoming request payload boundaries across identity and session routes.
 * Acts as an automated gating layer intercepting incoming requests to ensure data cleanliness
 * on `req.body` before processing reaches corresponding controllers.
 * @module validations/auth
 */

const { celebrate, Joi, Segments } = require("celebrate");

/**
 * Validation middleware for provisioning a brand-new user identity.
 * @type {Object}
 * @property {Object} [Segments.BODY] - Intercepts and parses incoming JSON keys on `req.body`.
 * @description Enforces structural constraints:
 * - name: String, trimmed, length bounded between 2 and 50 characters.
 * - email: Valid standardized format, lowercase normalized, and trimmed.
 * - password: Raw string requirement with a baseline minimum length of 8 characters.
 * - roles: Non-empty array collection assigning client system visibility privileges.
 * - termsAccepted: Explicit boolean literal validation flag that must evaluate strictly to true.
 */
const registerValidation = celebrate({
  [Segments.BODY]: Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Name is required.",
      "string.min": "Name must be at least 2 characters.",
      "string.max": "Name cannot exceed 50 characters.",
      "any.required": "Name is required.",
    }),

    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Email is required.",
      "string.email": "Please provide a valid email address.",
      "any.required": "Email is required.",
    }),

    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required.",
      "string.min": "Password must be at least 8 characters.",
      "any.required": "Password is required.",
    }),

    roles: Joi.array().items(Joi.string()).min(1).required().messages({
      "array.base": "Roles must be an array.",
      "array.min": "At least one role is required.",
      "any.required": "Roles are required.",
    }),

    termsAccepted: Joi.boolean().valid(true).required().messages({
      "any.only": "You must accept the terms and conditions.",
      "any.required": "Terms acceptance is required.",
    }),
  }),
});

/**
 * Validation middleware for verifying returning client login credentials.
 * @type {Object}
 * @property {Object} [Segments.BODY] - Intercepts and parses incoming JSON keys on `req.body`.
 * @description Enforces identity authentication constraints:
 * - email: Valid standardized format, lowercase normalized, and trimmed. Required for account tracking.
 * - password: Plain text match string. Required to evaluate cryptography hash comparisons.
 */
const loginValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Email is required.",
      "string.email": "Please provide a valid email address.",
      "any.required": "Email is required.",
    }),

    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required.",
      "string.min": "Password must be at least 8 characters.",
      "any.required": "Password is required.",
    }),
  }),
});

/**
 * Validation middleware for verifying and provisioning federated Google OAuth identities.
 * @type {Object}
 * @property {Object} [Segments.BODY] - Intercepts and parses incoming JSON keys on `req.body`.
 * @description Enforces federated authentication and onboarding constraints:
 * - credential: Raw string JWT ID token issued by Google authentication services. Required.
 * - roles: Non-empty array collection whitelisting client system visibility privileges ("mentor", "mentee"). Required.
 * - termsAccepted: Explicit boolean literal validation flag that must evaluate strictly to true. Required.
 */
const googleAuthValidation = celebrate({
  [Segments.BODY]: Joi.object({
    credential: Joi.string().required().messages({
      "string.empty": "Google credential token is required.",
      "any.required": "Google credential token is required.",
    }),
    roles: Joi.array()
      .items(Joi.string().valid("mentor", "mentee"))
      .min(1)
      .required()
      .messages({
        "array.base": "Roles must be an array.",
        "array.min": "At least one role is required.",
        "any.required": "Roles are required.",
      }),
    termsAccepted: Joi.boolean().valid(true).required().messages({
      "any.only": "You must accept the terms and conditions.",
      "any.required": "Terms acceptance is required.",
    }),
  }),
});

/**
 * Validation middleware for LinkedIn OAuth token exchange.
 * @type {Object}
 * @property {Object} [Segments.BODY] - Intercepts and parses incoming JSON keys on `req.body`.
 * @description Enforces structural constraints:
 * - code: LinkedIn authorization code string returned from OAuth callback.
 * - roles: Non-empty array restricted to mentor or mentee tier designations.
 * - termsAccepted: Explicit boolean literal validation flag that must evaluate strictly to true.
 */
const linkedinAuthValidation = celebrate({
  [Segments.BODY]: Joi.object({
    code: Joi.string().required().messages({
      "string.empty": "LinkedIn authorization code is required.",
      "any.required": "LinkedIn authorization code is required.",
    }),
    roles: Joi.array()
      .items(Joi.string().valid("mentor", "mentee"))
      .min(1)
      .required()
      .messages({
        "array.base": "Roles must be an array.",
        "array.min": "At least one role is required.",
        "any.required": "Roles are required.",
      }),
    termsAccepted: Joi.boolean().valid(true).required().messages({
      "any.only": "You must accept the terms and conditions.",
      "any.required": "Terms acceptance is required.",
    }),
  }),
});

module.exports = {
  registerValidation,
  loginValidation,
  googleAuthValidation,
  linkedinAuthValidation,
};
