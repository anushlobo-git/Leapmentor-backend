/**
 * @fileoverview Password Recovery Request Validation Schemas
 * @description Intercepts identity recovery payloads, filtering text formats,
 * structural token strings, and credential lengths via celebrate and Joi.
 */

const { celebrate, Joi, Segments } = require("celebrate");

/**
 * Validation rules for requesting a recovery OTP.
 * @route POST /api/v1/auth/forgot-password
 */
const sendForgotPasswordOtpValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Email address field cannot be submitted empty.",
      "string.email": "Please specify a valid email address structure.",
      "any.required": "Target account email identity pointer is required.",
    }),
  }),
});

/**
 * Validation rules for checking dynamic token matching keys.
 * @route POST /api/v1/auth/verify-reset-otp
 */
const verifyResetOtpValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.email": "Please provide a valid email address structure.",
      "any.required": "Email coordinate identity map context is required.",
    }),
    otp: Joi.string().trim().required().messages({
      "string.empty":
        "Verification token string code cannot be submitted empty.",
      "any.required": "The numeric validation code tracking token is required.",
    }),
  }),
});

/**
 * Validation rules for final stage credential update executions.
 * @route POST /api/v1/auth/reset-password
 */
const resetPasswordValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    otp: Joi.string().trim().required(),
    newPassword: Joi.string().min(6).required().messages({
      "string.empty": "The replacement security credential cannot be empty.",
      "string.min": "Password must be at least 6 characters",
      "any.required": "New plain text structural target password is required.",
    }),
  }),
});

module.exports = {
  sendForgotPasswordOtpValidation,
  verifyResetOtpValidation,
  resetPasswordValidation,
};
