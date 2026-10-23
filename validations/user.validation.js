/**
 * @fileoverview User Self-Service Validation Schemas
 * @description Validates requests a logged-in user makes about their own account,
 * including adding an additional role to their own account (RBAC).
 */

const { celebrate, Joi, Segments } = require("celebrate");
const { ALL_ROLES } = require("../constants/roles");

// `Joi.valid(...ALL_ROLES)` is built from the central role registry, so a
// role added to constants/roles.js is automatically accepted here — this
// file never needs to be edited to recognize a new role name.
const addRoleValidation = celebrate({
  [Segments.BODY]: Joi.object({
    role: Joi.string()
      .valid(...ALL_ROLES)
      .required()
      .messages({
        "any.only": `role must be one of: ${ALL_ROLES.join(", ")}`,
      }),
  }),
});

module.exports = {
  addRoleValidation,
};
