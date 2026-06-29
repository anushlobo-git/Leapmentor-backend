/**
 * @fileoverview Mentor Earnings and Financial Payout Controller
 * @description Thin request/response handlers managing mentor balances, ledger-aggregated revenue trends,
 * historical payouts, and outbound payment withdrawal orchestration via parameter injection.
 */

const catchAsync = require("../utils/catchAsync");

const createEarningsController = ({ earningsService }) => {
  /**
   * Fetch high-level earnings telemetry, total clear balances, and escrow distributions.
   * @route   GET /api/v1/earnings
   * @access  Private (Mentor Only)
   */
  const getEarningsSummary = catchAsync(async (req, res, next) => {
    const result = await earningsService.getEarningsSummaryService(
      req.user._id,
    );
    return res.status(200).json({ success: true, ...result });
  });

  /**
   * Fetch aggregated multi-month or weekly earnings distribution chronological trend charts.
   * @route   GET /api/v1/earnings/chart
   * @access  Private (Mentor Only)
   */
  const getEarningsChart = catchAsync(async (req, res, next) => {
    const period = req.query.period === "weekly" ? "weekly" : "monthly";
    const result = await earningsService.getEarningsChartService(
      req.user._id,
      period,
    );
    return res.status(200).json({ success: true, ...result });
  });

  /**
   * Retrieve a historical audit ledger of processed and pending payout distributions.
   * @route   GET /api/v1/earnings/payouts
   * @access  Private (Mentor Only)
   */
  const getPayoutHistory = catchAsync(async (req, res, next) => {
    const result = await earningsService.getPayoutHistoryService(
      req.user._id,
      req.query,
    );
    return res.status(200).json({ success: true, ...result });
  });

  /**
   * Initiate an outbound wallet balance withdrawal transfer to the linked financial account.
   * @route   POST /api/v1/earnings/withdraw
   * @access  Private (Mentor Only)
   */
  const withdrawEarnings = catchAsync(async (req, res, next) => {
    const result = await earningsService.withdrawEarningsService(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      ...result,
    });
  });

  return {
    getEarningsSummary,
    getEarningsChart,
    getPayoutHistory,
    withdrawEarnings,
  };
};

module.exports = createEarningsController;
