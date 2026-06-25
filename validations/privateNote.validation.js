/**
 * @fileoverview Private Note Request Validation Schemas
 * @description Utilizes celebrate and Joi to intercept and filter personal workspace payloads,
 * string lengths, and MongoDB 24-character hexadecimal ObjectId paths.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates initialization parameters when spinning up a new private note.
 * @route POST /api/v1/private-notes
 */
const createNoteValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "connectRequestId must match a structurally valid 24-character hex identifier.",
      "any.required":
        "An active connectRequestId workspace reference layer is required.",
    }),
    title: Joi.string().trim().max(200).allow("").optional().messages({
      "string.max": "Note title descriptions cannot exceed 200 characters.",
    }),
    content: Joi.string().max(20000).allow("").optional().messages({
      "string.max":
        "Note body content payload volume cannot exceed 20000 characters.",
    }),
  }),
});

/**
 * Validates connection channel markers across text document arrays listings.
 * @route GET /api/v1/private-notes/:connectRequestId
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
 * Validates note tracking criteria parameters for mutations and asset destruction routes.
 * @route PATCH /api/v1/private-notes/:id
 * @route DELETE /api/v1/private-notes/:id
 */
const noteIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Target document index identification reference must follow valid ObjectId patterns.",
      "any.required": "The source document identifier parameter is required.",
    }),
  }),
  [Segments.BODY]: Joi.object({
    title: Joi.string().trim().max(200).optional(),
    content: Joi.string().max(20000).optional(),
  }),
});

module.exports = {
  createNoteValidation,
  connectRequestIdParamValidation,
  noteIdParamValidation,
};
