/**
 * @fileoverview Admin Payments Domain Controller
 * @description Coordinates financial telemetry request parsing, passing tasks straight
 * down to services guarded by a Cache-Aside enhancement layer.
 */

const catchAsync = require("../utils/catchAsync");

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
    res.status(200).json({ success: true, data });
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
    res.status(200).json({ success: true, data });
  });

  /**
   * Query a filtered, paginated sub-block of platform ledger rows.
   * @route   GET /api/v1/admin/payments/transactions
   */
  const getTransactions = catchAsync(async (req, res) => {
    const result = await adminPaymentsService.getTransactionsService(req.query);
    res.status(200).json({ success: true, ...result });
  });

  return {
    getPaymentStats,
    getRevenueChart,
    getTransactions,
  };
};

module.exports = createAdminPaymentsController;
