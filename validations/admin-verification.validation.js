/**
 * @fileoverview Admin Mentor Verification Parameters Validation Schemas
 * @description Validates structural hex route configurations before passing control down the stack.
 */

const { celebrate, Joi, Segments } = require("celebrate");

// Regular Expression validating standard 24-character hexadecimal Mongoose ObjectIds
const MONGO_HEX_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const mentorProfileIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    mentorProfileId: Joi.string()
      .regex(MONGO_HEX_ID_REGEX)
      .required()
      .messages({
        "string.pattern.base":
          "The provided mentor profile identification route parameter is structurally invalid.",
        "any.required":
          "The unique mentor profile target parameter tracking key is required.",
      }),
  }),
});

module.exports = {
  mentorProfileIdParamValidation,
};
