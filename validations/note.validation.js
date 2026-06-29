/**
 * @fileoverview Note Request Validation Schemas
 * @description Validates note upload, listing, and deletion requests using celebrate and Joi.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Reusable helper to generate standard MongoDB ObjectId validations.
 * Eliminates repeated token structures and boilerplate message declarations.
 */
const validateMongoId = (fieldName, customRequiredMessage) =>
  Joi.string()
    .regex(objectIdRegex)
    .required()
    .messages({
      "string.pattern.base": `${fieldName} must be a valid 24-character hex ObjectId.`,
      "any.required": customRequiredMessage || `${fieldName} is required.`,
    });

/**
 * Validates metadata submitted alongside uploaded note files.
 * @route POST /api/v1/notes/upload
 */
const uploadNoteValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: validateMongoId("connectRequestId"),
    title: Joi.string().trim().max(200).optional().messages({
      "string.max": "Title cannot exceed 200 characters.",
    }),
    isPrivate: Joi.alternatives()
      .try(Joi.boolean(), Joi.string().valid("true", "false"))
      .optional()
      .default(false),
  }),
});

/**
 * Validates the connectRequestId route parameter for note listing routes.
 * @route GET /api/v1/notes/:connectRequestId
 * @route GET /api/v1/notes/:connectRequestId/private
 */
const connectRequestIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: validateMongoId("connectRequestId"),
  }),
});

/**
 * Validates the note id route parameter for deletion.
 * @route DELETE /api/v1/notes/:id
 */
const noteIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: validateMongoId("id", "Note id is required."),
  }),
});

module.exports = {
  uploadNoteValidation,
  connectRequestIdParamValidation,
  noteIdParamValidation,
};
