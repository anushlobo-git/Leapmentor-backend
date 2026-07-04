/**
 * @fileoverview Admin Payments Domain Controller
 * @description Coordinates financial telemetry request parsing, passing tasks straight
 * down to services guarded by a Cache-Aside enhancement layer.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");

const CACHE_TTL_SECONDS = 300; // 5 Minutes
const STATS_CACHE_KEY = "admin:payments:telemetry-stats";
const CHART_CACHE_KEY = "admin:payments:revenue-charts";

const createAdminPaymentsController = ({adminPaymentsService, cacheUtility}) => {
  /**
   * Fetch high-level platform-wide accounting balances and commission metrics.
   * @route   GET /api/v1/admin/payments/stats
   */
  const getPaymentStats = catchAsync(async (req, res) => {
    const adminId = req.admin?._id  ;
    const data = await cacheUtility.getOrSetCache(
      `${STATS_CACHE_KEY}:${adminId}`,
      CACHE_TTL_SECONDS,
      () => adminPaymentsService.getPaymentStatsService(adminId),
    );
    sendSuccess(res, data, "Payment stats retrieved");
  });

  /**
   * Fetch a chronological collection breakdown mapping historical revenue streams.
   * @route   GET /api/v1/admin/payments/revenue-chart
   */
  const getRevenueChart = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      CHART_CACHE_KEY,
      CACHE_TTL_SECONDS,
      () => adminPaymentsService.getRevenueChartService(),
    );
    sendSuccess(res, data, "Revenue chart retrieved");
  });

  /**
   * Query a filtered, paginated sub-block of platform ledger rows.
   * @route   GET /api/v1/admin/payments/transactions
   */
  const getTransactions = catchAsync(async (req, res) => {
    const result = await adminPaymentsService.getTransactionsService(req.query);
    sendSuccess(res, result, "Transactions retrieved");
  });

  return {
    getPaymentStats,
    getRevenueChart,
    getTransactions,
  };
};

module.exports = createAdminPaymentsController;
