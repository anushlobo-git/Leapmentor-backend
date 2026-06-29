/**
 * @fileoverview Admin Reports Domain Controller
 * @description Injects Cache-Aside mechanics to intercept statistics queries,
 * purging cache buffers upon execution of transactional changes.
 */

const catchAsync = require("../utils/catchAsync");

const CACHE_TTL_SECONDS = 300; // 5-Minute corporate caching standard window
const STATS_CACHE_KEY = "admin:reports:telemetry-stats";

const createAdminReportsController = ({adminReportsService, cacheUtility}) => {
  const getReportStats = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      STATS_CACHE_KEY,
      CACHE_TTL_SECONDS,
      () => adminReportsService.getReportStatsService(),
    );
    res.status(200).json({ success: true, ...data });
  });

  const getReports = catchAsync(async (req, res) => {
    const result = await adminReportsService.getReportsService(req.query);
    res.status(200).json({ success: true, ...result });
  });

  const handleReport = catchAsync(async (req, res) => {
    const report = await adminReportsService.handleReportService(
      req.params.id,
      req.body,
      req.admin._id,
    );
    await cacheUtility.evictCache?.(STATS_CACHE_KEY);

    res
      .status(200)
      .json({ success: true, message: `Report ${req.body.status}.`, report });
  });

  const processRefund = catchAsync(async (req, res) => {
    const { refundAmount } = await adminReportsService.processRefundService(
      req.params.id,
      req.body.adminNote,
      req.admin._id,
    );
    await cacheUtility.evictCache?.(STATS_CACHE_KEY);

    res.status(200).json({
      success: true,
      message: `Refund of ${refundAmount} tokens processed successfully.`,
      refundAmount,
    });
  });

  const deleteSession = catchAsync(async (req, res) => {
    await adminReportsService.deleteSessionService(
      req.params.id,
      req.body.adminNote,
      req.admin._id,
    );
    await cacheUtility.evictCache?.(STATS_CACHE_KEY);

    res.status(200).json({
      success: true,
      message: "Session deleted and both parties notified.",
    });
  });

  return {
    getReportStats,
    getReports,
    handleReport,
    processRefund,
    deleteSession,
  };
};

module.exports = createAdminReportsController;
