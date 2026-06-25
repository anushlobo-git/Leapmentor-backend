/**
 * @fileoverview HelpCenter Ingestion and Support Request Validation Schemas
 * @description Utilizes celebrate and Joi to intercept, sanitize, and validate form properties
 * and MongoDB 24-character hexadecimal ObjectId path references.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates initialization parameter arrays when submitting a public concern report ticket.
 * @route POST /api/v1/support/messages
 */
const createMessageValidation = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.empty": "Sender email address cannot be submitted empty.",
      "string.email": "Please provide a valid email address structure.",
      "any.required": "Sender email address context is required.",
    }),
    subject: Joi.string().trim().max(200).required().messages({
      "string.empty": "Subject line summary heading cannot be empty.",
      "string.max":
        "Ticket subject heading summary cannot exceed 200 characters.",
      "any.required":
        "Support ticket subject line summary heading is required.",
    }),
    message: Joi.string().trim().max(5000).required().messages({
      "string.empty":
        "Support ticket core body narrative text cannot be empty.",
      "string.max":
        "Support ticket body narrative content volume cannot exceed 5000 characters.",
      "any.required":
        "Support ticket core body description narrative text is required.",
    }),
    role: Joi.string()
      .valid("mentor", "mentee", "user")
      .optional()
      .default("user")
      .messages({
        "any.only":
          "Specified role must match a recognized account interaction profile classification option.",
      }),
  }),
});

/**
 * Validates ticket context parameters for administrative resolution paths.
 * @route PATCH /api/v1/support/messages/:id/resolve
 */
const resolveMessageValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Target ticket index identification reference must follow valid ObjectId patterns.",
      "any.required":
        "The support ticket unique identifier parameter is required.",
    }),
  }),
});

module.exports = {
  createMessageValidation,
  resolveMessageValidation,
};
