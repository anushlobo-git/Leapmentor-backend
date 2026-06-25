/**
 * @fileoverview Invoice Request Validation Schemas
 * @description Utilizes celebrate and Joi to intercept and validate path parameters
 * ensuring clean hex BSON object IDs before PDF generation starts.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for invoice retrieval operations.
 * @route GET /api/v1/invoices/:connectRequestId
 */
const getInvoicePdfValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The parsed context identifier parameter must match a valid structural ObjectId key.",
      "any.required":
        "The target connectRequestId routing query parameter path field is required.",
    }),
  }),
});

module.exports = {
  getInvoicePdfValidation,
};
