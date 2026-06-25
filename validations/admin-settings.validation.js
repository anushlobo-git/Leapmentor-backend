/**
 * @fileoverview Admin Settings Parameter and Body Validation Schemas
 * @description Validates configuration parameters, password modifications, and credential requests.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const addAdminBodyValidation = celebrate({
  [Segments.BODY]: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "Administrator name cannot be transmitted blank.",
      "any.required": "The name configuration attribute field is required.",
    }),
    email: Joi.string().email().lowercase().trim().required().messages({
      "string.email":
        "The administrator identity email address structure is invalid.",
      "any.required": "An executive notification email address is required.",
    }),
  }),
});

const updateCommissionBodyValidation = celebrate({
  [Segments.BODY]: Joi.object({
    commissionRate: Joi.number().min(0).max(100).required().messages({
      "number.base":
        "Commission rate metrics parameters must map to numerical values.",
      "number.min": "The platform matching fee cut cannot fall below 0%.",
      "number.max":
        "The platform matching fee configuration boundary cannot exceed 100%.",
      "any.required": "The target commission rate field modifier is required.",
    }),
  }),
});

const changePasswordBodyValidation = celebrate({
  [Segments.BODY]: Joi.object({
    oldPassword: Joi.string().required().messages({
      "any.required":
        "Current security validation password confirmation is required.",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min":
        "Proposed security credentials must equal or exceed 6 characters.",
      "any.required": "Target new password update parameter field is required.",
    }),
  }),
});

module.exports = {
  addAdminBodyValidation,
  updateCommissionBodyValidation,
  changePasswordBodyValidation,
};
