/**
 * @fileoverview Admin Reports Controller
 * @description Thin request/response handlers for platform support ticket and report resolution.
 */
const catchAsync = require("../utils/catchAsync");
const {
  getReportStatsService,
  getReportsService,
  handleReportService,
  processRefundService,
  deleteSessionService,
} = require("../services/admin.reports.service");
/**
 * Retrieve admin dashboard report overview statistics.
 * @route   GET /api/v1/admin/reports/stats
 * @access  Private (Admin Only)
 */
const getReportStats = catchAsync(async (req, res) => {
  const result = await getReportStatsService();
  res.json({ success: true, ...result });
});
/**
 * Retrieve a paginated, filtered list of all user reports.
 * @route   GET /api/v1/admin/reports
 * @access  Private (Admin Only)
 */
const getReports = catchAsync(async (req, res) => {
  const result = await getReportsService(req.query);
  res.json({ success: true, ...result });
});
/**
 * Update the status of a report to resolved or dismissed.
 * @route   PATCH /api/v1/admin/reports/:id
 * @access  Private (Admin Only)
 */
const handleReport = catchAsync(async (req, res) => {
  const report = await handleReportService(
    req.params.id,
    req.body,
    req.admin._id,
  );
  res.json({ success: true, message: `Report ${req.body.status}.`, report });
});
/**
 * Process a token escrow refund for a valid mentee report.
 * @route   POST /api/v1/admin/reports/:id/refund
 * @access  Private (Admin Only)
 */
const processRefund = catchAsync(async (req, res) => {
  const { refundAmount } = await processRefundService(
    req.params.id,
    req.body.adminNote,
    req.admin._id,
  );
  res.json({
    success: true,
    message: `Refund of ${refundAmount} tokens processed successfully.`,
    refundAmount,
  });
});
/**
 * Delete a session and notify both participating parties.
 * @route   DELETE /api/v1/admin/reports/:id/session
 * @access  Private (Admin Only)
 */
const deleteSession = catchAsync(async (req, res) => {
  await deleteSessionService(req.params.id, req.body.adminNote, req.admin._id);
  res.json({
    success: true,
    message: "Session deleted and both parties notified.",
  });
});

module.exports = {
  getReportStats,
  getReports,
  handleReport,
  processRefund,
  deleteSession,
};
