/**
 * @fileoverview Shared and Private Note Request Validation Schemas
 * @description Utilizes celebrate and Joi to filter multipart form descriptors,
 * file visibility properties, and MongoDB 24-character hexadecimal ObjectId references.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates metadata payload properties submitted alongside binary files.
 * @route POST /api/v1/notes/upload
 */
const uploadNoteValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "connectRequestId must match a structurally valid 24-character hex identifier.",
      "any.required":
        "An active connectRequestId workspace reference is required.",
    }),
    title: Joi.string().trim().max(200).optional().messages({
      "string.max": "Attachment customized title cannot exceed 200 characters.",
    }),
    isPrivate: Joi.alternatives()
      .try(Joi.boolean(), Joi.string().valid("true", "false"))
      .optional()
      .default(false),
  }),
});

/**
 * Validates connection channel markers across structural document listings.
 * @route GET /api/v1/notes/:connectRequestId
 * @route GET /api/v1/notes/:connectRequestId/private
 */
const connectRequestIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The parsed context identifier parameters must match valid ObjectId keys.",
      "any.required":
        "The targeting connection tracker ID parameter is required.",
    }),
  }),
});

/**
 * Validates document document indexes during file removal transactions.
 * @route DELETE /api/v1/notes/:id
 */
const noteIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Target document index identification reference must follow valid ObjectId patterns.",
      "any.required": "The source document identifier parameter is required.",
    }),
  }),
});

module.exports = {
  uploadNoteValidation,
  connectRequestIdParamValidation,
  noteIdParamValidation,
};
