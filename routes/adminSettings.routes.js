/**
 * @fileoverview Admin Settings Configuration Routes
 * @description  Handles administrative system overviews, provisioning secondary admin credentials,
 * and managing platform fee commission parameters.
 * @prefix       /api/v1/admin/settings
 * @access       Private (Admin Only)
 */

const express = require("express");
const router = express.Router();
const { adminAuthenticate } = require("../middleware/adminAuth");
const {
  getOverview,
  changePassword,
  addAdmin,
  getCommission,
  updateCommission,
} = require("../controllers/adminSettings.controller");

// Protect all configuration gateways with administrative session authentication
router.use(adminAuthenticate);

// ── SYSTEM CONFIGURATION ENDPOINTS ───────────────────────────
/**
 * Fetch high-level overview metrics for the administration settings dashboard.
 * @route   GET /api/v1/admin/settings/overview
 * @access  Private (Admin Only)
 */
router.get("/overview", getOverview);

/**
 * Register and provision a brand-new administrative account entity.
 * @route   POST /api/v1/admin/settings/add-admin
 * @access  Private (Super Admin Only)
 */
router.post("/add-admin", addAdmin);

// ── FINANCIAL COMMISSION ENDPOINTS ───────────────────────────

/**
 * Fetch current platform-wide matching fee commission rate details.
 * @route   GET /api/v1/admin/settings/commission
 * @access  Private (Admin Only)
 */
router.get("/commission", getCommission);

/**
 * Update global platform-wide financial fee commission parameters.
 * @route   PUT /api/v1/admin/settings/commission
 * @access  Private (Admin Only)
 */
router.put("/commission", updateCommission);

module.exports = router;
