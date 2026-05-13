// controllers/admin/adminReports.controller.js
const {
  getReportStatsService,
  getReportsService,
  handleReportService,
  processRefundService,
  deleteSessionService,
} = require("../../services/admin.reports.service");

const getReportStats = async (req, res) => {
  try {
    const result = await getReportStatsService();
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getReports = async (req, res) => {
  try {
    const result = await getReportsService(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const handleReport = async (req, res) => {
  try {
    const report = await handleReportService(
      req.params.id,
      req.body,
      req.admin._id,
    );
    return res.json({
      success: true,
      message: `Report ${req.body.status}.`,
      report,
    });
  } catch (err) {
    if (err.message === "INVALID_STATUS")
      return res
        .status(400)
        .json({ message: "Status must be resolved or dismissed." });
    if (err.message === "REPORT_NOT_FOUND")
      return res.status(404).json({ message: "Report not found." });
    return res.status(500).json({ message: err.message });
  }
};

const processRefund = async (req, res) => {
  try {
    const { refundAmount } = await processRefundService(
      req.params.id,
      req.body.adminNote,
      req.admin._id,
    );
    return res.json({
      success: true,
      message: `Refund of ${refundAmount} tokens processed successfully.`,
      refundAmount,
    });
  } catch (err) {
    if (err.message === "REPORT_NOT_FOUND")
      return res.status(404).json({ message: "Report not found." });
    if (err.message === "NOT_MENTEE_REPORT")
      return res
        .status(403)
        .json({ message: "Only mentees can request refunds." });
    if (err.message === "NOT_REFUND_REPORT")
      return res
        .status(400)
        .json({ message: "This report is not a refund request." });
    if (err.message === "ALREADY_REFUNDED")
      return res.status(400).json({ message: "Refund already processed." });
    if (err.message === "SESSION_NOT_FOUND")
      return res.status(404).json({ message: "Session not found." });
    if (err.message === "NOT_PAID")
      return res.status(400).json({ message: "Session has not been paid." });
    if (err.message === "WALLET_NOT_FOUND")
      return res.status(404).json({ message: "Mentee wallet not found." });
    return res.status(500).json({ message: err.message });
  }
};

const deleteSession = async (req, res) => {
  try {
    await deleteSessionService(
      req.params.id,
      req.body.adminNote,
      req.admin._id,
    );
    return res.json({
      success: true,
      message: "Session deleted and both parties notified.",
    });
  } catch (err) {
    if (err.message === "REPORT_NOT_FOUND")
      return res.status(404).json({ message: "Report not found." });
    if (err.message === "SESSION_NOT_FOUND")
      return res
        .status(404)
        .json({ message: "Session not found or already deleted." });
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getReportStats,
  getReports,
  handleReport,
  processRefund,
  deleteSession,
};
