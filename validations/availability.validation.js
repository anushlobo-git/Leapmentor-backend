const { celebrate, Joi, Segments } = require("celebrate");

// ── Reusable sub-schemas ──────────────────────────────────────

const timeSlotSchema = Joi.object({
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({
      "string.pattern.base": "startTime must be in HH:MM 24-hour format.",
      "any.required": "startTime is required.",
    }),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({
      "string.pattern.base": "endTime must be in HH:MM 24-hour format.",
      "any.required": "endTime is required.",
    }),
}).unknown(true)
  .strip();;

const specificDateSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "date must be in YYYY-MM-DD format.",
      "any.required": "date is required.",
    }),
  slots: Joi.array().items(timeSlotSchema).required(),
})
  .unknown(true)
  .strip(); ;

const weeklyHourSchema = Joi.object({
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
      "any.only": "day must be a valid day of the week.",
      "any.required": "day is required.",
    }),
  isAvailable: Joi.boolean().required().messages({
    "any.required": "isAvailable is required.",
  }),
  slots: Joi.array().items(timeSlotSchema).default([]),
})
  .unknown(true)
  .strip();;

const mentorIdParamSchema = celebrate({
  [Segments.PARAMS]: Joi.object({
    mentorId: Joi.string().hex().length(24).required().messages({
      "string.hex": "Invalid mentor ID format.",
      "string.length": "Invalid mentor ID length.",
      "any.required": "mentorId is required.",
    }),
  }),
});

// ── Route Validators ──────────────────────────────────────────

/**
 * POST /api/v1/availability
 */
const createAvailabilityValidation = celebrate({
  [Segments.BODY]: Joi.object({
    timezone: Joi.string().required().messages({
      "string.empty": "Timezone is required.",
      "any.required": "Timezone is required.",
    }),
    sessionDurations: Joi.array()
      .items(Joi.number().valid(30, 45, 60))
      .min(1)
      .required()
      .messages({
        "array.base": "sessionDurations must be an array.",
        "array.min": "At least one session duration is required.",
        "any.required": "sessionDurations are required.",
      }),
    specificDates: Joi.array().items(specificDateSchema).default([]),
    weeklyHours: Joi.array().items(weeklyHourSchema).default([]),
  }),
});

/**
 * PATCH /api/v1/availability/me
 */
const updateAvailabilityValidation = celebrate({
  [Segments.BODY]: Joi.object({
    timezone: Joi.string().messages({
      "string.empty": "Timezone cannot be empty.",
    }),
    sessionDurations: Joi.array()
      .items(Joi.number().valid(30, 45, 60))
      .min(1)
      .messages({
        "array.base": "sessionDurations must be an array.",
        "array.min": "At least one session duration is required.",
      }),
    specificDates: Joi.array().items(specificDateSchema),
    weeklyHours: Joi.array().items(weeklyHourSchema),
    googleCalendarConnected: Joi.boolean(),
  })
    .min(1)
    .messages({
      // ✅ at least one field required
      "object.min": "At least one field must be provided to update.",
    }),
});

/**
 * GET /api/v1/availability/:mentorId/slots
 */
const slotsQueryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    duration: Joi.number().valid(30, 45, 60).default(60).messages({
      "any.only": "Duration must be 30, 45, or 60 minutes.",
    }),
  }),
});

module.exports = {
  createAvailabilityValidation,
  updateAvailabilityValidation,
  mentorIdParamSchema,
  slotsQueryValidation,
};
