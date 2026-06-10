/**
 * @fileoverview Admin Settings Configuration Controller
 * @description  Thin request/response handlers managing administrative system properties,
 * credential security lifecycles, and global fee commission structures.
 */

const catchAsync = require("../utils/catchAsync");
const {
  getOverviewService,
  changeAdminPasswordService,
  addAdminService,
  getCommissionService,
  updateCommissionService,
} = require("../services/admin.settings.service");

// ── SYSTEM CONFIGURATION HANDLERS ───────────────────────────

/**
 * Fetch high-level overview metrics for the administration settings dashboard.
 * @route   GET /api/v1/admin/settings/overview
 * @access  Private (Admin Only)
 */
const getOverview = catchAsync(async (req, res) => {
  const result = await getOverviewService();
  res.status(200).json({ success: true, ...result });
});

/**
 * Modify and update the authenticated administrator's account password.
 * @route   PUT /api/v1/admin/settings/change-password
 * @access  Private (Admin Only)
 */
const changePassword = catchAsync(async (req, res) => {
  await changeAdminPasswordService(req.admin._id, req.body);
  res
    .status(200)
    .json({ success: true, message: "Password changed successfully." });
});

/**
 * Register and provision a brand-new secondary administrative account entity.
 * @route   POST /api/v1/admin/settings/add-admin
 * @access  Private (Super Admin Only)
 */
const addAdmin = catchAsync(async (req, res) => {
  const result = await addAdminService(req.body);
  res.status(201).json({
    success: true,
    message: `Admin account created for ${req.body.email}.`,
    ...result,
  });
});

// ── FINANCIAL COMMISSION HANDLERS ───────────────────────────

/**
 * Fetch current platform-wide matching fee commission rate details.
 * @route   GET /api/v1/admin/settings/commission
 * @access  Private (Admin Only)
 */
const getCommission = catchAsync(async (req, res) => {
  const commissionRate = await getCommissionService(req.admin._id);
  res.status(200).json({ success: true, commissionRate });
});

/**
 * Update global platform-wide financial fee commission parameters.
 * @route   PUT /api/v1/admin/settings/commission
 * @access  Private (Admin Only)
 */
const updateCommission = catchAsync(async (req, res) => {
  const rate = await updateCommissionService(
    req.admin._id,
    req.body.commissionRate,
  );
  res.status(200).json({
    success: true,
    message: `Commission rate updated to ${rate}%`,
    commissionRate: rate,
  });
});

module.exports = {
  getOverview,
  changePassword,
  addAdmin,
  getCommission,
  updateCommission,
};
