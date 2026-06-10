/**
 * @fileoverview Mentor Earnings and Financial Payout Controller
 * @description  Thin request/response handlers managing mentor balances, ledger-aggregated revenue trends,
 * historical payouts, and outbound payment withdrawal orchestration.
 */

const catchAsync = require("../utils/catchAsync");
const earningsService = require("../services/earnings.service");

// ── METRICS & HISTORICAL TRENDS ──────────────────────────────

/**
 * Fetch high-level earnings telemetry, total clear balances, and escrow distributions.
 * @route   GET /api/v1/earnings
 * @access  Private (Mentor Only)
 */
const getEarningsSummary = catchAsync(async (req, res) => {
  const result = await earningsService.getEarningsSummaryService(req.user._id);
  res.status(200).json({ success: true, ...result });
});

/**
 * Fetch aggregated multi-month or weekly earnings distribution chronological trend charts.
 * @route   GET /api/v1/earnings/chart
 * @access  Private (Mentor Only)
 */
const getEarningsChart = catchAsync(async (req, res) => {
  const period = req.query.period === "weekly" ? "weekly" : "monthly";
  const result = await earningsService.getEarningsChartService(
    req.user._id,
    period,
  );
  res.status(200).json({ success: true, ...result });
});

// ── PAYOUTS & DISBURSEMENTS ──────────────────────────────────

/**
 * Retrieve a historical audit ledger of processed and pending payout distributions.
 * @route   GET /api/v1/earnings/payouts
 * @access  Private (Mentor Only)
 */
const getPayoutHistory = catchAsync(async (req, res) => {
  const result = await earningsService.getPayoutHistoryService(
    req.user._id,
    req.query,
  );
  res.status(200).json({ success: true, ...result });
});

/**
 * Initiate an outbound wallet balance withdrawal transfer to the linked financial account.
 * @route   POST /api/v1/earnings/withdraw
 * @access  Private (Mentor Only)
 */
const withdrawEarnings = catchAsync(async (req, res) => {
  const result = await earningsService.withdrawEarningsService(req.user._id);

  res.status(200).json({
    success: true,
    message: "Withdrawal request submitted successfully",
    ...result,
  });
});

module.exports = {
  getEarningsSummary,
  getEarningsChart,
  getPayoutHistory,
  withdrawEarnings,
};
