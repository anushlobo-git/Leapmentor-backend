/**
 * @fileoverview Admin Reports Request Validation Engine
 * @description Validates query fields, request bodies, and incoming hex parameters.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const MONGO_HEX_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const getReportsQueryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(10).optional(),
    search: Joi.string().trim().allow("").optional(),
    status: Joi.string()
      .valid("open", "under_review", "resolved", "dismissed")
      .optional(),
  }),
});

const handleReportBodyValidation = celebrate({
  [Segments.BODY]: Joi.object({
    status: Joi.string().valid("resolved", "dismissed").required().messages({
      "any.only":
        "Target resolution state status must map to 'resolved' or 'dismissed'.",
    }),
    adminNote: Joi.string().trim().max(1000).allow("").optional(),
  }),
});

const refundOrSessionBodyValidation = celebrate({
  [Segments.BODY]: Joi.object({
    adminNote: Joi.string().trim().max(1000).allow("").optional(),
  }),
});

const reportIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(MONGO_HEX_ID_REGEX).required().messages({
      "string.pattern.base":
        "Target path identifier parameters must map to a valid hexadecimal Object ID structure.",
    }),
  }),
});

module.exports = {
  getReportsQueryValidation,
  handleReportBodyValidation,
  refundOrSessionBodyValidation,
  reportIdParamValidation,
};
