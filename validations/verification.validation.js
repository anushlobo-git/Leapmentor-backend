/**
 * @fileoverview User Account Verification Request Validation Schemas
 * @description Configures strict fail-fast structural parameter gates checking
 * email notation strings, alphanumeric code formats, and cryptographic tokens.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const emailSchema = Joi.string()
  .email()
  .lowercase()
  .trim()
  .required()
  .messages({
    "string.empty": "Email address cannot be submitted empty.",
    "string.email": "Please provide a structurally valid email address.",
    "any.required":
      "Account context email identification coordinate is required.",
  });

/**
 * Validates request payload properties when initializing verification tokens delivery.
 * @route POST /api/v1/verification/send
 * @route POST /api/v1/verification/resend
 */
const emailPayloadValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: emailSchema,
  }),
});

/**
 * Validates numeric security parameters input by the user on login dashboards.
 * @route POST /api/v1/verification/verify-otp
 */
const verifyOtpValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: emailSchema,
    otp: Joi.string().trim().length(6).required().messages({
      "string.empty": "Verification code string content cannot be empty.",
      "string.length":
        "Verification OTP code must contain exactly 6 characters.",
      "any.required": "The 6-digit numeric verification OTP is required.",
    }),
  }),
});

/**
 * Validates tracking properties embedded inside secure magic link components.
 * @route GET /api/v1/verification/verify/:token
 */
const verifyLinkValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    token: Joi.string().trim().required().messages({
      "any.required":
        "Cryptographic lookup security validation token parameters are required.",
    }),
  }),
  [Segments.QUERY]: Joi.object({
    email: emailSchema,
  }),
});

module.exports = {
  emailPayloadValidation,
  verifyOtpValidation,
  verifyLinkValidation,
};
