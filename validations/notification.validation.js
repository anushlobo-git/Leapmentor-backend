/**
 * @fileoverview User Real-time Alerts and Notifications Validation Schemas
 * @description Utilizes celebrate and Joi to filter and sanitize incoming path variables
 * ensuring clean hex BSON object IDs before database modifications occur.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates path parameters for isolated single-notification mutations.
 * @route PATCH /api/v1/notifications/:id/read
 * @route DELETE /api/v1/notifications/:id
 */
const notificationIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The notification target parameter must match a structurally valid 24-character hex ObjectId.",
      "any.required":
        "The unique notification target id query parameter field is required.",
    }),
  }),
});

module.exports = {
  notificationIdParamValidation,
};
