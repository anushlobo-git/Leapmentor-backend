/**
 * @fileoverview Report and Dispute Resolution Request Validation Schemas
 * @description Enforces fail-fast payload guards filtering incident attributes,
 * administrative status transitions, and MongoDB 24-character hexadecimal ObjectId paths.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates request payload properties when creating a fresh incident report ticket.
 * @route POST /api/v1/reports
 */
const submitReportValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "connectRequestId must match a structurally valid 24-character hex identifier.",
      "any.required":
        "connectRequestId path parameter identifier link is required.",
    }),
    complaintType: Joi.string().trim().required().messages({
      "string.empty": "Complaint type classification string cannot be empty.",
      "any.required": "Complaint type parameter is a mandatory field.",
    }),
    description: Joi.string().trim().min(10).required().messages({
      "string.empty": "Incident explanation details cannot be sent empty.",
      "string.min":
        "Description payload metrics must encompass at least 10 characters.",
      "any.required": "Incident description explanation is required.",
    }),
  }),
});

/**
 * Validates connection channel markers across personal report metrics lookups.
 * @route GET /api/v1/reports/my/:connectRequestId
 */
const getMyReportValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The specified connectRequestId must be a valid ObjectId layout.",
      "any.required":
        "The targeting connectRequestId path parameter field is required.",
    }),
  }),
});

/**
 * Validates filtering criteria variables used to load corporate dashboards.
 * @route GET /api/v1/reports/admin
 */
const getAllReportsValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    status: Joi.string()
      .valid("open", "under_review", "resolved", "dismissed")
      .optional()
      .messages({
        "any.only":
          "Status filter criteria must match one of 'open', 'under_review', 'resolved', or 'dismissed'.",
      }),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
});

/**
 * Validates parameters applied to update tickets status configurations.
 * @route PATCH /api/v1/reports/admin/:reportId
 */
const updateReportStatusValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    reportId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Target reportId context identifier reference must follow valid ObjectId patterns.",
      "any.required":
        "The reportId parameter is required to initialize updates.",
    }),
  }),
  [Segments.BODY]: Joi.object({
    status: Joi.string()
      .valid("open", "under_review", "resolved", "dismissed")
      .required()
      .messages({
        "any.only": "Invalid administrative transition status state specified.",
        "any.required":
          "Transition status parameter field configuration is required.",
      }),
    adminNote: Joi.string().trim().max(2000).allow("").optional().messages({
      "string.max":
        "Administrative logging note length cannot exceed 2000 characters limit.",
    }),
  }),
});

module.exports = {
  submitReportValidation,
  getMyReportValidation,
  getAllReportsValidation,
  updateReportStatusValidation,
};
