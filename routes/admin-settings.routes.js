/**
 * @fileoverview Admin Settings Configuration Routes
 * @description Handles administrative system overviews, provisioning credentials, and platform fees.
 */

const express = require("express");
const {
  addAdminBodyValidation,
  updateCommissionBodyValidation,
  changePasswordBodyValidation,
} = require("../validations/admin-settings.validation");

const createAdminSettingsRoutes = (
  adminSettingsController,
  adminAuthenticate,
) => {
  const router = express.Router();

  // Protect all configuration gateways with administrative session authentication
  router.use(adminAuthenticate);

  // ── SYSTEM CONFIGURATION ENDPOINTS ───────────────────────────
  // @route   GET /api/v1/admin/settings/overview
  router.get("/overview", adminSettingsController.getOverview);

  // @route   POST /api/v1/admin/settings/add-admin
  router.post(
    "/add-admin",
    addAdminBodyValidation,
    adminSettingsController.addAdmin,
  );

  // @route   PUT /api/v1/admin/settings/change-password
  router.put(
    "/change-password",
    changePasswordBodyValidation,
    adminSettingsController.changePassword,
  );

  // ── FINANCIAL COMMISSION ENDPOINTS ───────────────────────────
  // @route   GET /api/v1/admin/settings/commission
  router.get("/commission", adminSettingsController.getCommission);

  // @route   PUT /api/v1/admin/settings/commission
  router.put(
    "/commission",
    updateCommissionBodyValidation,
    adminSettingsController.updateCommission,
  );

  return router;
};

module.exports = createAdminSettingsRoutes;
