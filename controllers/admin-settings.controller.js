/**
 * @fileoverview Admin Settings Configuration Controller
 * @description Request handlers managing administrative system properties,
 * credential lifecycles, and global fee structures with automated Cache-Aside buffers.
 */

const catchAsync = require("../utils/catchAsync");

const OVERVIEW_CACHE_KEY = "admin:settings:dashboard-overview";
const CACHE_TTL_SECONDS = 300; // 5-Minute Cache Window

const createAdminSettingsController = ({adminSettingsService, cacheUtility}) => {
  const getOverview = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      OVERVIEW_CACHE_KEY,
      CACHE_TTL_SECONDS,
      () => adminSettingsService.getOverviewService(),
    );
    res.status(200).json({ success: true, ...data });
  });

  const changePassword = catchAsync(async (req, res) => {
    await adminSettingsService.changeAdminPasswordService(
      req.admin._id,
      req.body,
    );
    res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  });

  const addAdmin = catchAsync(async (req, res) => {
    const result = await adminSettingsService.addAdminService(req.body);
    // Evict statistics overview to preserve system data integrity across modifications
    await cacheUtility.evictCache?.(OVERVIEW_CACHE_KEY);

    res.status(201).json({
      success: true,
      message: `Admin account created for ${req.body.email}.`,
      ...result,
    });
  });

  const getCommission = catchAsync(async (req, res) => {
    const commissionRate = await adminSettingsService.getCommissionService(
      req.admin._id,
    );
    res.status(200).json({ success: true, commissionRate });
  });

  const updateCommission = catchAsync(async (req, res) => {
    const rate = await adminSettingsService.updateCommissionService(
      req.admin._id,
      req.body.commissionRate,
    );
    res.status(200).json({
      success: true,
      message: `Commission rate updated to ${rate}%`,
      commissionRate: rate,
    });
  });

  return {
    getOverview,
    changePassword,
    addAdmin,
    getCommission,
    updateCommission,
  };
};

module.exports = createAdminSettingsController;
