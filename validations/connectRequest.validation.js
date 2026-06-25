/**
 * @fileoverview Connection Request Input Validation Schemas
 * @description Fail-fast structural checks filtering payload attributes,
 * array range bounds, and MongoDB ObjectId structures via standalone Joi middleware.
 */

const Joi = require("joi");
const AppError = require("../utils/AppError");

// Shared reusable schema components
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const slotSchema = Joi.object({
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
    .messages({ "any.required": "Each slot must have a day field." }),
  date: Joi.string().regex(dateRegex).required().messages({
    "string.pattern.base":
      "Date must follow the absolute continuous YYYY-MM-DD string format constraint",
    "any.required": "Each slot must have a date field.",
  }),
  startTime: Joi.string().regex(timeRegex).required().messages({
    "string.pattern.base":
      "Start time must precisely align with 24-hour HH:MM notation limits",
    "any.required": "Each slot must have a startTime field.",
  }),
  endTime: Joi.string().regex(timeRegex).required().messages({
    "string.pattern.base":
      "End time must precisely align with 24-hour HH:MM notation limits",
    "any.required": "Each slot must have an endTime field.",
  }),
});

/**
 * Validates initialization payload configurations when sending a request.
 */
const sendConnectRequestValidation = (req, res, next) => {
  const schema = Joi.object({
    mentorId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base": "Invalid mentor reference identifier format",
      "string.empty": "mentorId is required",
      "any.required": "mentorId is required",
    }),
    message: Joi.string().max(1000).allow("").optional(),
    selectedSlots: Joi.array()
      .items(slotSchema)
      .min(1)
      .max(5)
      .required()
      .messages({
        "array.base": "Selected slots must be an array collection",
        "array.min": "At least one slot must be selected",
        "array.max": "Maximum 5 slots can be proposed",
        "any.required": "At least one slot must be selected",
      }),
    sessionRate: Joi.number().min(1).optional().messages({
      "number.min": "sessionRate must be at least 1",
    }),
    sessionCount: Joi.number().min(1).optional().messages({
      "number.min": "sessionCount must be at least 1",
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((d) => d.message).join(", ");
    throw new AppError(errorDetails, 400);
  }
  return next();
};

/**
 * Validates decisions (accept/reject) alongside matching confirmation details.
 */
const respondToRequestValidation = (req, res, next) => {
  const schema = Joi.object({
    status: Joi.string().valid("accepted", "rejected").required().messages({
      "any.only": "Status must be 'accepted' or 'rejected'",
      "any.required": "Status is required",
    }),
    confirmedSlot: Joi.object({
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
        .required(),
      date: Joi.string().regex(dateRegex).required(),
      startTime: Joi.string().regex(timeRegex).required(),
      endTime: Joi.string().regex(timeRegex).required(),
    })
      .when("status", {
        is: "accepted",
        then: Joi.required(),
        otherwise: Joi.optional().allow(null),
      })
      .messages({
        "any.required": "confirmedSlot is required when accepting",
      }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((d) => d.message).join(", ");
    throw new AppError(errorDetails, 400);
  }
  return next();
};

/**
 * Validates request transfer target parameters.
 */
const referRequestValidation = (req, res, next) => {
  const schema = Joi.object({
    referToMentorId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "referToMentorId must match standard structural formats",
      "string.empty": "referToMentorId is required",
      "any.required": "referToMentorId is required",
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((d) => d.message).join(", ");
    throw new AppError(errorDetails, 400);
  }
  return next();
};

/**
 * Dynamic URL Parameter validator ensuring target route context IDs match MongoDB standard keys.
 */
const validateObjectId = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The parsed context identifier parameters must match valid ObjectId keys",
    }),
  });

  const { error } = schema.validate(req.params, { abortEarly: false });
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
  return next();
};

module.exports = {
  sendConnectRequestValidation,
  respondToRequestValidation,
  referRequestValidation,
  validateObjectId,
};
