/**
 * @fileoverview Connection Request Request Validation Schemas
 * @description Configures celebrate payload gates validating incoming parameters,
 * proposal arrays bounds, and multi-format slot lifecycle indicators.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

// Shared slot layout parameters configuration
const baseSlotFields = {
  day: Joi.string()
    .valid(
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    )
    .required()
    .messages({
      "any.required": "Each slot must have a day field specification.",
    }),
  date: Joi.string().regex(dateRegex).required().messages({
    "string.pattern.base":
      "Date must follow the absolute continuous YYYY-MM-DD string format constraint.",
    "any.required": "Each slot must have a date field coordinate.",
  }),
  startTime: Joi.string().regex(timeRegex).required().messages({
    "string.pattern.base":
      "Start time must precisely align with 24-hour HH:MM notation limits.",
    "any.required": "Each slot must have a startTime field timestamp.",
  }),
  endTime: Joi.string().regex(timeRegex).required().messages({
    "string.pattern.base":
      "End time must precisely align with 24-hour HH:MM notation limits.",
    "any.required": "Each slot must have an endTime field timestamp.",
  }),
};

const slotSchema = Joi.object(baseSlotFields);

// Neutralizes the bad request crash by explicitly ignoring internal database state keys
// Neutralizes the bad request crash by explicitly allowing strings, empty strings, or null values
const confirmedSlotSchema = Joi.object({
  ...baseSlotFields,
  meetingLink: Joi.string().allow("").optional(),
  menteeMarked: Joi.boolean().optional(),
  mentorMarked: Joi.boolean().optional(),
  completedAt: Joi.any().optional(),
  status: Joi.string().optional(),
  cancelledBy: Joi.string().allow("", null).optional(), // 😎 Added null support here
  cancelledAt: Joi.any().optional(),
  cancellationReason: Joi.string().allow("", null).optional(), // 😎 Added null support here
  isRescheduled: Joi.boolean().optional(),
  rescheduledFromIndex: Joi.number().allow(null).optional(),
}).unknown(true); // ← Prevents strict crashes if newer lifecycle attributes pass through from the client state

/**
 * Validates initialization payload properties when sending a new request.
 * @route POST /api/v1/connect-requests
 */
const sendConnectRequestValidation = celebrate({
  [Segments.BODY]: Joi.object({
    mentorId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Invalid mentor reference identifier format layout.",
      "any.required":
        "mentorId context reference key tracking identifier is required.",
    }),
    message: Joi.string().max(1000).allow("").optional(),
    selectedSlots: Joi.array()
      .items(slotSchema)
      .min(1)
      .max(5)
      .required()
      .messages({
        "array.min":
          "At least one slot block must be selected to initialize a transaction.",
        "array.max":
          "Maximum 5 slots can be proposed within a single invitation framework.",
      }),
    sessionRate: Joi.number().min(1).optional(),
    sessionCount: Joi.number().min(1).optional(),
  }),
});

/**
 * Validates decisions (accept/reject) while ignoring state-bleeding parameters.
 * @route PATCH /api/v1/connect-requests/:id
 */
const respondToRequestValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Target request connection ID must match a structurally valid 24-character hex ObjectId.",
    }),
  }),
  [Segments.BODY]: Joi.object({
    status: Joi.string().valid("accepted", "rejected").required().messages({
      "any.only":
        "Status state choice modifier must be exactly 'accepted' or 'rejected'.",
    }),
    confirmedSlot: confirmedSlotSchema
      .when("status", {
        is: "accepted",
        then: Joi.required(),
        otherwise: Joi.optional().allow(null),
      })
      .messages({
        "any.required":
          "confirmedSlot parameters data block configuration is required when accepting an invitation.",
      }),
  }),
});

/**
 * Validates request transfer target parameters.
 * @route PATCH /api/v1/connect-requests/:id/refer
 */
const referRequestValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required(),
  }),
  [Segments.BODY]: Joi.object({
    referToMentorId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "referToMentorId must follow clean 24-character hex ObjectId layout definitions.",
      "any.required":
        "Target referral mentor reference coordinate identifier is required.",
    }),
  }),
});

/**
 * Dynamic URL Parameter validator ensuring target route context IDs match standard keys.
 */
const validateObjectId = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The parsed context identifier parameters must match valid 24-character hex ObjectId keys.",
    }),
  }),
});

module.exports = {
  sendConnectRequestValidation,
  respondToRequestValidation,
  referRequestValidation,
  validateObjectId,
};
