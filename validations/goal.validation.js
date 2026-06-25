/**
 * @fileoverview Goals and Milestones Request Validation Schemas
 * @description Configures fail-fast query parameters validation using celebrate and Joi.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createGoalValidation = celebrate({
  [Segments.BODY]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "connectRequestId must match a valid hexadecimal 24-character ObjectId string.",
      "any.required": "connectRequestId is a mandatory field.",
    }),
    title: Joi.string().trim().max(200).required().messages({
      "string.empty": "Title cannot be sent empty.",
      "string.max": "Title cannot exceed 200 characters.",
      "any.required": "Goal title parameter is required.",
    }),
    description: Joi.string().trim().max(1000).allow("").optional(),
    startDate: Joi.string().regex(dateRegex).allow(null).optional().messages({
      "string.pattern.base":
        "startDate must strictly comply with YYYY-MM-DD format limits.",
    }),
    endDate: Joi.string().regex(dateRegex).allow(null).optional().messages({
      "string.pattern.base":
        "endDate must strictly comply with YYYY-MM-DD format limits.",
    }),
  }),
});

const getGoalValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    connectRequestId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "Target context parameter must match a valid structural ObjectId.",
    }),
  }),
});

const updateGoalValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    goalId: Joi.string().regex(objectIdRegex).required(),
  }),
  [Segments.BODY]: Joi.object({
    title: Joi.string().trim().max(200).optional(),
    description: Joi.string().trim().max(1000).allow("").optional(),
    startDate: Joi.string().regex(dateRegex).allow(null).optional(),
    endDate: Joi.string().regex(dateRegex).allow(null).optional(),
    status: Joi.string()
      .valid("active", "completed", "abandoned")
      .optional()
      .messages({
        "any.only":
          "Status must match one of the active options: 'active', 'completed', or 'abandoned'.",
      }),
  }),
});

const createMilestoneValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    goalId: Joi.string().regex(objectIdRegex).required(),
  }),
  [Segments.BODY]: Joi.object({
    title: Joi.string().trim().max(300).required().messages({
      "string.empty": "Milestone title cannot be evaluated empty.",
      "any.required": "Milestone title configuration parameter is required.",
    }),
    description: Joi.string().trim().max(500).allow("").optional(),
    dueDate: Joi.string().regex(dateRegex).allow(null).optional(),
  }),
});

const milestoneIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    milestoneId: Joi.string().regex(objectIdRegex).required().messages({
      "string.pattern.base":
        "The specified milestone identifier must follow valid ObjectId patterns.",
    }),
  }),
});

const updateMilestoneValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    milestoneId: Joi.string().regex(objectIdRegex).required(),
  }),
  [Segments.BODY]: Joi.object({
    title: Joi.string().trim().max(300).optional(),
    description: Joi.string().trim().max(500).allow("").optional(),
    isCompleted: Joi.boolean().optional(),
  }),
});

module.exports = {
  createGoalValidation,
  getGoalValidation,
  updateGoalValidation,
  createMilestoneValidation,
  milestoneIdParamValidation,
  updateMilestoneValidation,
};
