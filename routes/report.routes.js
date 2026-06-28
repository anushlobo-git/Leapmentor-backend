/**
 * @fileoverview Compliance Tracking and Incident Dispute Resolution Systems Routes Blueprint
 * @description Mounts declarative request verification check parameters directly into core pathways.
 */

const express = require("express");

const createReportRoutes = ({ reportController, middlewares, validations }) => {
  const router = express.Router();
  const { authenticate, requireRole, upload } = middlewares;
  const {
    submitReportValidation,
    getMyReportValidation,
    getAllReportsValidation,
    updateReportStatusValidation,
  } = validations;

  // Establish global token lock boundaries across endpoints
  router.use(authenticate);

  // --- USER TRACKS ENDPOINTS (MENTOR / MENTEE ACCESS PRIVILEGES) ---
  router.post(
    "/",
    requireRole("mentor", "mentee"),
    upload.single("screenshot"),
    submitReportValidation,
    reportController.submitReport,
  );

  router.get(
    "/my/:connectRequestId",
    requireRole("mentor", "mentee"),
    getMyReportValidation,
    reportController.getMyReport,
  );

  // --- COMPLIANCE PANELS TRACKS ENDPOINTS (EXCLUSIVE ADMINISTRATOR FIREWALL GATES) ---
  router.use(requireRole("admin"));

  router.get("/admin", getAllReportsValidation, reportController.getAllReports);
  router.patch(
    "/admin/:reportId",
    updateReportStatusValidation,
    reportController.updateReportStatus,
  );

  return router;
};

module.exports = createReportRoutes;
