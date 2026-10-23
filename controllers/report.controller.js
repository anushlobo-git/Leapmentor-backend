/**
 * @fileoverview Report Controller
 * @description Thin network transport interface mapping parameters directly down onto reporting domain logic services.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");

const createReportController = ({ reportService }) => {
  const submitReport = catchAsync(async (req, res, next) => {
    const report = await reportService.createIncidentReport(
      req.user,
      req.body,
      req.file,
    );
    return sendSuccess(
      res,
      { report },
      "Report submitted successfully. Our team will review it shortly.",
      STATUS.CREATED,
    );
  });

  const getMyReport = catchAsync(async (req, res, next) => {
    const result = await reportService.getMySessionReport(
      req.params.connectRequestId,
      req.user._id,
    );
    return sendSuccess(res, result, "Session report retrieved");
  });

  const getAllReports = catchAsync(async (req, res, next) => {
    const result = await reportService.getAdminReportsDashboard(req.query);
    return sendSuccess(res, result, "Reports retrieved");
  });

  const updateReportStatus = catchAsync(async (req, res, next) => {
    const report = await reportService.processAdminReportUpdate(
      req.params.reportId,
      req.user._id,
      req.body,
    );
    return sendSuccess(res, { report }, "Report status updated");
  });

  return {
    submitReport,
    getMyReport,
    getAllReports,
    updateReportStatus,
  };
};

module.exports = createReportController;
