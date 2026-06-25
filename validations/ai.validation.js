/**
 * @fileoverview AI Subsystem Payload Input Validation Schemas
 * @description Enforces strict structure rules on conversational messages arrays and prompts.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const chatCompletionBodyValidation = celebrate({
  [Segments.BODY]: Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid("user", "assistant", "system").required(),
          content: Joi.string().trim().required(),
        }).unknown(true),
      )
      .required()
      .messages({
        "array.base":
          "Conversational messages must be formatted inside a structured array.",
        "any.required": "The messages array parameter field is required.",
      }),
    systemPrompt: Joi.string().trim().max(8000).allow("").optional(),
  }),
});

module.exports = {
  chatCompletionBodyValidation,
};
