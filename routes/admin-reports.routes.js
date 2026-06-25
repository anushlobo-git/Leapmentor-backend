/**
 * @fileoverview Admin Escalations and Dispute Reports Routes
 * @description Handles administrative dispute telemetry, user report management ledger queries,
 * resolution status updates, refund processing, and structural session deletions.
 * Completely decoupled from concrete implementations via parameter inversion.
 */

const express = require("express");

// Imported localized request validation middleware schemas
const {
  getReportsQueryValidation,
  handleReportBodyValidation,
  refundOrSessionBodyValidation,
  reportIdParamValidation,
} = require("../validations/admin-reports.validation");

const createAdminReportsRoutes = (
  adminReportsController,
  adminAuthenticate,
) => {
  const router = express.Router();

  // Apply administrative session verification to all report and dispute gateways
  router.use(adminAuthenticate);

  // @route   GET /api/v1/admin/reports/stats
  router.get("/stats", adminReportsController.getReportStats);

  // @route   GET /api/v1/admin/reports
  router.get("/", getReportsQueryValidation, adminReportsController.getReports);

  // @route   PATCH /api/v1/admin/reports/:id
  router.patch(
    "/:id",
    reportIdParamValidation,
    handleReportBodyValidation,
    adminReportsController.handleReport,
  );

  // @route   POST /api/v1/admin/reports/:id/refund
  router.post(
    "/:id/refund",
    reportIdParamValidation,
    refundOrSessionBodyValidation,
    adminReportsController.processRefund,
  );

  // @route   DELETE /api/v1/admin/reports/:id/session
  router.delete(
    "/:id/session",
    reportIdParamValidation,
    refundOrSessionBodyValidation,
    adminReportsController.deleteSession,
  );

  return router;
};

module.exports = createAdminReportsRoutes;
