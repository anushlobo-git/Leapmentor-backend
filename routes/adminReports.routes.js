/**
 * @fileoverview Admin Escalations and Dispute Reports Routes
 * @description  Handles administrative dispute telemetry, user report management ledger queries,
 * resolution status updates, refund processing, and structural session deletions.
 * @prefix       /api/v1/admin/reports
 * @access       Private (Admin Only)
 */

const express = require("express");
const router = express.Router();
const { adminAuthenticate } = require("../middleware/adminAuth");
const {
  getReportStats,
  getReports,
  handleReport,
  processRefund,
  deleteSession,
} = require("../controllers/adminReports.controller");

// Apply administrative session verification to all report and dispute gateways
router.use(adminAuthenticate);

// @route   GET /api/v1/admin/reports/stats
router.get("/stats", getReportStats);

// @route   GET /api/v1/admin/reports
router.get("/", getReports);

// @route   PATCH /api/v1/admin/reports/:id
router.patch("/:id", handleReport);

// @route   POST /api/v1/admin/reports/:id/refund
router.post("/:id/refund", processRefund);

// @route   DELETE /api/v1/admin/reports/:id/session
router.delete("/:id/session", deleteSession);

module.exports = router;
