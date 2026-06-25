/**
 * @fileoverview Admin Payments Payload Request Validation Schemas
 * @description Intercepts and screens inbound parameters using Celebrate/Joi rules.
 */

const { celebrate, Joi, Segments } = require("celebrate");

const getTransactionsQueryValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(20).default(10).optional(),
    search: Joi.string().trim().allow("").optional(),
    type: Joi.string()
      .valid(
        "credit",
        "debit",
        "escrow_hold",
        "escrow_release",
        "escrow_refund",
        "commission_deduct",
        "mentor_payout",
      )
      .optional(),
  }),
});

module.exports = {
  getTransactionsQueryValidation,
};
