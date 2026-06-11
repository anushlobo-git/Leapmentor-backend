/**
 * @fileoverview Compliance Tracking and Incident Dispute Resolution Systems Routes Blueprint
 * @prefix       /api/v1/reports
 * @access       Private (Authenticated Dashboard Sessions Only)
 */
const express = require("express");
const router = express.Router();

const { authenticate, requireRole } = require("../middleware/authenticate");
const { upload } = require("../middleware/upload.middleware");
const {
  submitReport,
  getMyReport,
  getAllReports,
  updateReportStatus,
} = require("../controllers/report.controller");

// Establish baseline platform passport verification boundaries rules processing
router.use(authenticate);

// --- USER TRACKS ENDPOINTS (MENTOR / MENTEE ACCESS PRIVILEGES) ---
// @route   POST /api/v1/reports
router.post(
  "/",
  requireRole("mentor", "mentee"),
  upload.single("screenshot"),
  submitReport,
);

// @route   GET /api/v1/reports/my/:connectRequestId
router.get(
  "/my/:connectRequestId",
  requireRole("mentor", "mentee"),
  getMyReport,
);

// --- COMPLIANCE PANELS TRACKS ENDPOINTS (EXCLUSIVE ADMINISTRATOR FIREWALL GATES) ---
router.use(requireRole("admin"));

// @route   GET /api/v1/reports/admin
router.get("/admin", getAllReports);

// @route   PATCH /api/v1/reports/admin/:reportId
router.patch("/admin/:reportId", updateReportStatus);

module.exports = router;
