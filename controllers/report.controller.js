/**
 * @fileoverview Report Controller
 * @description Thin network transport interface mapping parameters directly down onto reporting domain logic services.
 */

const catchAsync = require("../utils/catchAsync");

const createReportController = ({ reportService }) => {
  const submitReport = catchAsync(async (req, res, next) => {
    const report = await reportService.createIncidentReport(
      req.user,
      req.body,
      req.file,
    );
    return res.status(201).json({
      success: true,
      message:
        "Report submitted successfully. Our team will review it shortly.",
      report,
    });
  });

  const getMyReport = catchAsync(async (req, res, next) => {
    const result = await reportService.getMySessionReport(
      req.params.connectRequestId,
      req.user._id,
    );
    return res.status(200).json(result);
  });

  const getAllReports = catchAsync(async (req, res, next) => {
    const result = await reportService.getAdminReportsDashboard(req.query);
    return res.status(200).json(result);
  });

  const updateReportStatus = catchAsync(async (req, res, next) => {
    const report = await reportService.processAdminReportUpdate(
      req.params.reportId,
      req.user._id,
      req.body,
    );
    return res.status(200).json({
      success: true,
      report,
    });
  });

  return {
    submitReport,
    getMyReport,
    getAllReports,
    updateReportStatus,
  };
};

module.exports = createReportController;
