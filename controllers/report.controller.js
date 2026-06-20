/**
 * @fileoverview Report Controller
 * @description Thin network transmission gateway capturing route variables and passing operations into underlying services.
 */
const catchAsync = require("../utils/catchAsync");
const reportService = require("../services/report.service");

/**
 * Handles incoming multipart payloads processing new support tickets creation requests.
 * @route   POST /api/v1/reports
 * @access  Private (Mentee / Mentor Only)
 */
const submitReport = catchAsync(async (req, res) => {
  const report = await reportService.createIncidentReport(
    req.user,
    req.body,
    req.file,
  );

  res.status(201).json({
    success: true,
    message: "Report submitted successfully. Our team will review it shortly.",
    report,
  });
});

/**
 * Pulls current user-owned report documents matching specified token boundaries.
 * @route   GET /api/v1/reports/my/:connectRequestId
 * @access  Private (Mentee / Mentor Only)
 */
const getMyReport = catchAsync(async (req, res) => {
  const result = await reportService.getMySessionReport(
    req.params.connectRequestId,
    req.user._id,
  );
  res.status(200).json(result);
});

/**
 * Compiles a comprehensive paginated checklist summary mapping all outward global platforms issues.
 * @route   GET /api/v1/reports/admin
 * @access  Private (Admin Only)
 */
const getAllReports = catchAsync(async (req, res) => {
  const result = await reportService.getAdminReportsDashboard(req.query);
  res.status(200).json(result);
});

/**
 * Applies mutations updating historical tickets status keys matrices tracking.
 * @route   PATCH /api/v1/reports/admin/:reportId
 * @access  Private (Admin Only)
 */
const updateReportStatus = catchAsync(async (req, res) => {
  const report = await reportService.processAdminReportUpdate(
    req.params.reportId,
    req.user._id,
    req.body,
  );
  res.status(200).json({
    success: true,
    report,
  });
});

module.exports = {
  submitReport,
  getMyReport,
  getAllReports,
  updateReportStatus,
};
