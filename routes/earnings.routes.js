/**
 * @fileoverview Mentor Earnings and Financial Payout Routes
 * @description  Provides endpoints for mentors to track their revenue summaries,
 * analyze chronological earnings trends, view historical payouts, and initiate withdrawals.
 * @prefix       /api/v1/earnings
 * @access       Private (Mentor Only)
 */

const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  getEarningsSummary,
  getEarningsChart,
  getPayoutHistory,
  withdrawEarnings,
} = require("../controllers/earnings.controller");

// ── METRICS & HISTORICAL TRENDS ──────────────────────────────

/**
 * Fetch high-level earnings telemetry, total clear balances, and escrow distributions.
 * @route   GET /api/v1/earnings
 * @access  Private (Mentor Only)
 */
router.get("/", authenticate, requireRole("mentor"), getEarningsSummary);

/**
 * Fetch aggregated multi-month earnings distribution chronological trend charts.
 * @route   GET /api/v1/earnings/chart
 * @access  Private (Mentor Only)
 */
router.get("/chart", authenticate, requireRole("mentor"), getEarningsChart);

// ── PAYOUTS & DISBURSEMENTS ──────────────────────────────────

/**
 * Retrieve a historical audit ledger of processed and pending payout distributions.
 * @route   GET /api/v1/earnings/payouts
 * @access  Private (Mentor Only)
 */
router.get("/payouts", authenticate, requireRole("mentor"), getPayoutHistory);

/**
 * Initiate an outbound wallet balance withdrawal transfer to the linked financial account.
 * @route   POST /api/v1/earnings/withdraw
 * @access  Private (Mentor Only)
 */
router.post("/withdraw", authenticate, requireRole("mentor"), withdrawEarnings);

module.exports = router;
