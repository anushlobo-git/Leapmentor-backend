/**
 * @fileoverview Admin Payments Controller
 * @description  Thin request/response handlers delivering administrative payment telemetry,
 * platform financial distribution charts, and paginated audit ledgers.
 */

const catchAsync = require("../utils/catchAsync");
const {
  getPaymentStatsService,
  getRevenueChartService,
  getTransactionsService,
} = require("../services/admin.payments.service");

/**
 * Retrieve high-level platform escrow metrics and overall financial volume snapshots.
 * @route   GET /api/v1/admin/payments/stats
 * @access  Private (Admin Only)
 */
const getPaymentStats = catchAsync(async (req, res) => {
  const result = await getPaymentStatsService(req.admin._id);
  res.json({ success: true, ...result });
});

/**
 * Fetch aggregated platform revenue and earnings historical trend charts.
 * @route   GET /api/v1/admin/payments/chart
 * @access  Private (Admin Only)
 */
const getRevenueChart = catchAsync(async (req, res) => {
  const data = await getRevenueChartService();
  res.json({ success: true, data });
});

/**
 * Fetch a query-filtered, paginated global stream log of system transaction events.
 * @route   GET /api/v1/admin/payments/transactions
 * @access  Private (Admin Only)
 */
const getTransactions = catchAsync(async (req, res) => {
  const result = await getTransactionsService(req.query);
  res.json({ success: true, ...result });
});

module.exports = {
  getPaymentStats,
  getRevenueChart,
  getTransactions,
};
