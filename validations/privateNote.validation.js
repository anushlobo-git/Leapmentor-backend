/**
 * @fileoverview Private Note Validation Schemas
 * @description Validates private note creation, listing, update, and deletion requests.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// --- Reusable Shared Validation Components ---

const validateMongoId = (fieldName, customRequiredMessage) =>
  Joi.string()
    .regex(objectIdRegex)
    .required()
    .messages({
      "string.pattern.base": `${fieldName} must be a valid 24-character hex ObjectId.`,
      "any.required": customRequiredMessage || `${fieldName} is required.`,
    });

const titleSchema = Joi.string().trim().max(200).allow("").optional().messages({
  "string.max": "Title cannot exceed 200 characters.",
});

const contentSchema = Joi.string().max(20000).allow("").optional().messages({
  "string.max": "Content cannot exceed 20000 characters.",
});

// --- Exported Validation Middleware ---

/**
 * Validates request body when creating a new private note.
 * @route POST /api/v1/private-notes
 */
const createNoteValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: validateMongoId("connectRequestId"),
    title: titleSchema,
    content: contentSchema,
  }),
});

/**
 * Validates the connectRequestId route parameter for listing private notes.
 * @route GET /api/v1/private-notes/:connectRequestId
 */
const connectRequestIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: validateMongoId("connectRequestId"),
  }),
});

/**
 * Validates the note id route parameter and body for update and deletion.
 * @route PATCH /api/v1/private-notes/:id
 * @route DELETE /api/v1/private-notes/:id
 */
const noteIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: validateMongoId("id", "Note id is required."),
  }),
  [Segments.BODY]: Joi.object({
    title: titleSchema,
    content: contentSchema,
  }),
});

module.exports = {
  createNoteValidation,
  connectRequestIdParamValidation,
  noteIdParamValidation,
};
