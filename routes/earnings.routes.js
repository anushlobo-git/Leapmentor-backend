/**
 * @fileoverview Mentor Earnings and Financial Payout Routes
 * @description Provides endpoints for mentors to track their revenue summaries,
 * analyze chronological earnings trends, view historical payouts, and initiate withdrawals via injection.
 */

const express = require("express");

const createEarningsRoutes = ({ earningsController, middlewares, validations }) => {
  const router = express.Router();
  const { authenticate, requireRole } = middlewares;
  const { getEarningsChartValidation, getPayoutHistoryValidation } =
    validations;

  // ── METRICS & HISTORICAL TRENDS ──────────────────────────────

  // @route   GET /api/v1/earnings
  router.get(
    "/",
    authenticate,
    requireRole("mentor"),
    earningsController.getEarningsSummary,
  );

  // @route   GET /api/v1/earnings/chart
  router.get(
    "/chart",
    authenticate,
    requireRole("mentor"),
    getEarningsChartValidation,
    earningsController.getEarningsChart,
  );

  // ── PAYOUTS & DISBURSEMENTS ──────────────────────────────────

  // @route   GET /api/v1/earnings/payouts
  router.get(
    "/payouts",
    authenticate,
    requireRole("mentor"),
    getPayoutHistoryValidation,
    earningsController.getPayoutHistory,
  );

  // @route   POST /api/v1/earnings/withdraw
  router.post(
    "/withdraw",
    authenticate,
    requireRole("mentor"),
    earningsController.withdrawEarnings,
  );

  return router;
};

module.exports = createEarningsRoutes;
