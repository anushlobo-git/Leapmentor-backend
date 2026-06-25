/**
 * @fileoverview Concurrent Session Slot Locking System Request Validation Schemas
 * @description Configures declarative celebrate payload parameters checking
 * temporal time notation ranges, ISO formats, and valid BSON ObjectIds.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const slotFieldsSchema = Joi.object({
  mentorId: Joi.string().regex(objectIdRegex).required().messages({
    "string.pattern.base":
      "mentorId must match a structurally valid 24-character hex layout identifier.",
    "any.required":
      "mentorId context reference key tracking identifier is required.",
  }),
  date: Joi.string().regex(dateRegex).required().messages({
    "string.pattern.base":
      "Date parameter must follow clean YYYY-MM-DD text format limits.",
    "any.required": "Target calendar schedule lock date is required.",
  }),
  startTime: Joi.string().regex(timeRegex).required().messages({
    "string.pattern.base":
      "Start time notation format must align with 24-hour HH:MM criteria structures.",
    "any.required":
      "Appointment block initiation timestamp startTime is required.",
  }),
  endTime: Joi.string().regex(timeRegex).required().messages({
    "string.pattern.base":
      "End time notation format must align with 24-hour HH:MM criteria structures.",
    "any.required":
      "Appointment block termination timestamp endTime is required.",
  }),
});

/**
 * Validates initialization parameter limits when acquiring temporary holdings hooks.
 */
const lockSlotValidation = celebrate({
  [Segments.BODY]: slotFieldsSchema,
});

/**
 * Validates payload parameters when detaching an individual temporary hold block.
 */
const unlockSlotValidation = celebrate({
  [Segments.BODY]: slotFieldsSchema,
});

/**
 * Validates parameters applied to roll back mass user holds templates.
 */
const unlockAllValidation = celebrate({
  [Segments.BODY]: Joi.object({
    mentorId: Joi.string().regex(objectIdRegex).optional().messages({
      "string.pattern.base":
        "Optional modifier mentorId must evaluate to a valid ObjectId context string.",
    }),
  }),
});

/**
 * Validates param values querying live scheduling vacancies indices.
 */
const mentorIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    mentorId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Path tracking routing reference parameter must evaluate to a clean hex ObjectId.",
      "any.required":
        "The targeting mentorId routing query field parameter is required.",
    }),
  }),
});

module.exports = {
  lockSlotValidation,
  unlockSlotValidation,
  unlockAllValidation,
  mentorIdParamValidation,
};
