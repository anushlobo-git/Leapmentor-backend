/**
 * @fileoverview Session Scheduling Request Validation Schemas
 * @description Utilizes celebrate and Joi to intercept route query variables,
 * ISO date formats, array indexes, and 24-character hexadecimal MongoDB ObjectIds.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates baseline path looking up workspace slots.
 */
const getSlotsValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "connectRequestId must match a structurally valid 24-character hex identifier.",
      "any.required": "The connectRequestId target path variable is required.",
    }),
  }),
});

/**
 * Validates parameters applied to alter secure meeting link coordinates.
 */
const setMeetingLinkValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required(),
    slotIndex: Joi.number().integer().min(0).required().messages({
      "number.base":
        "slotIndex must evaluate to a valid integer array coordinate.",
    }),
  }),
  [Segments.BODY]: Joi.object({
    meetingLink: Joi.string().trim().uri().required().messages({
      "string.uri":
        "Please provide a valid structural absolute HTTP/HTTPS destination URL.",
      "any.required": "The meetingLink address string field is required.",
    }),
  }),
});

/**
 * Validates index markers applied to confirm completions.
 */
const slotIndexParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required(),
    slotIndex: Joi.number().integer().min(0).required(),
  }),
});

/**
 * Validates properties when appending an incremental slot block structure.
 */
const addSlotValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required(),
  }),
  [Segments.BODY]: Joi.object({
    date: Joi.string().regex(dateRegex).required().messages({
      "string.pattern.base":
        "Date must adhere strictly to the YYYY-MM-DD format constraint.",
    }),
    startTime: Joi.string().trim().required(),
    endTime: Joi.string().trim().required(),
  }),
});

/**
 * Validates descriptors transmitted when breaking off scheduled targets.
 */
const cancelSlotValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required(),
    slotIndex: Joi.number().integer().min(0).required(),
  }),
  [Segments.BODY]: Joi.object({
    reason: Joi.string().trim().max(1000).allow("").optional(),
  }),
});

/**
 * Validates calendar coordinates when rescheduling active lines.
 */
const rescheduleSlotValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required(),
    slotIndex: Joi.number().integer().min(0).required(),
  }),
  [Segments.BODY]: Joi.object({
    date: Joi.string().regex(dateRegex).required(),
    startTime: Joi.string().trim().required(),
    endTime: Joi.string().trim().required(),
  }),
});

/**
 * Validates duration criteria parameter tracking indicators.
 */
const getMentorAvailabilityValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required(),
  }),
  [Segments.QUERY]: Joi.object({
    duration: Joi.number()
      .integer()
      .valid(30, 45, 60, 90, 120)
      .optional()
      .default(60),
  }),
});

module.exports = {
  getSlotsValidation,
  setMeetingLinkValidation,
  slotIndexParamValidation,
  addSlotValidation,
  cancelSlotValidation,
  rescheduleSlotValidation,
  getMentorAvailabilityValidation,
};
