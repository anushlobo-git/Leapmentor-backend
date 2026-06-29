/**
 * @fileoverview Asset Upload Ingestion Request Validation Schemas
 * @description Utilizes celebrate and Joi to filter incoming form fields
 * and phone parameters before streaming files to cloud repositories.
 */

const { celebrate, Joi, Segments } = require("celebrate");

/**
 * Validates text properties submitted alongside registration documents.
 * @route POST /api/v1/upload/verification-documents
 */
const uploadVerificationDocsValidation = celebrate({
  [Segments.BODY]: Joi.object({
    phoneNumber: Joi.string().trim().min(5).max(20).required().messages({
      "string.empty": "Phone number cannot be submitted empty.",
      "any.required":
        "Phone number configuration is required for verification profiles.",
    }),
    imageName: Joi.string().trim().min(1).max(150).optional().messages({
      "string.empty": "Image name cannot be empty if provided.",
    }),
  }),
});



module.exports = {
  uploadVerificationDocsValidation,
};
