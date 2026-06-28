/**
 * @fileoverview Admin Controller Dashboard
 * @description Consolidated thin request/response handlers for admin authentication,
 * platform telemetry statistics, user interventions, and connection metrics. Receives injected systems.
 */

const catchAsync = require("../utils/catchAsync");

// Configured tracking constants
const MAX_COOKIE_AGE_HOURS = 8;
const CACHE_TTL_SECONDS = 300; // 5-Minute corporate caching standard window
const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: MAX_COOKIE_AGE_HOURS * 60 * 60 * 1000,
};

const createAdminController = ({
  adminAuthService,
  adminStatsService,
  adminUserService,
  adminEngagementService,
  cacheUtility
}) => {
  // ── AUTHENTICATION HANDLERS ─────────────────────────────────

  const adminLogin = catchAsync(async (req, res) => {
    const { token, admin } = await adminAuthService.adminLoginService(req.body);
    res.cookie("adminToken", token, ADMIN_COOKIE_OPTIONS);
    res.status(200).json({ success: true, admin });
  });

  const adminLogout = (req, res) => {
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.status(200).json({ success: true, message: "Logged out." });
  };

  const adminMe = catchAsync(async (req, res) => {
    res.status(200).json({ admin: req.admin });
  });

  // ── TELEMETRY STATS HANDLERS ────────────────────────────────

  const getStats = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:stats",
      CACHE_TTL_SECONDS,
      () => adminStatsService.getStatsService(),
    );
    res.status(200).json(data);
  });

  const getUserGrowth = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:growth",
      CACHE_TTL_SECONDS,
      () => adminStatsService.getUserGrowthService(),
    );
    res.status(200).json(data);
  });

  const getMentorIndustryStats = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:industries",
      CACHE_TTL_SECONDS,
      () => adminStatsService.getMentorIndustryStatsService(),
    );
    res.status(200).json(data);
  });

  // ── USER MANAGEMENT HANDLERS ────────────────────────────────

  const getUsers = catchAsync(async (req, res) => {
    const result = await adminUserService.getUsersService(req.query);
    res.status(200).json(result);
  });

  const getUserDetail = catchAsync(async (req, res) => {
    const result = await adminUserService.getUserDetailService(
      req.params.userId,
    );
    res.status(200).json(result);
  });

  const deleteUser = catchAsync(async (req, res) => {
    const { name, email } = await adminUserService.deleteUserService(
      req.params.userId,
    );
    res.status(200).json({
      success: true,
      message: `User ${name} (${email}) has been permanently deleted.`,
    });
  });

  const blockUser = catchAsync(async (req, res) => {
    const { name } = await adminUserService.blockUserService(req.params.userId);
    res
      .status(200)
      .json({ success: true, message: `User ${name} has been blocked.` });
  });

  const unblockUser = catchAsync(async (req, res) => {
    const { name } = await adminUserService.unblockUserService(
      req.params.userId,
    );
    res
      .status(200)
      .json({ success: true, message: `User ${name} has been restored.` });
  });

  // ── SYSTEM ENGAGEMENT HANDLERS ──────────────────────────────

  const getEngagementStats = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:engagements",
      CACHE_TTL_SECONDS,
      () => adminEngagementService.getEngagementStatsService(),
    );
    res.status(200).json(data);
  });

  const getEngagements = catchAsync(async (req, res) => {
    const result = await adminEngagementService.getEngagementsService(
      req.query,
    );
    res.status(200).json(result);
  });

  return {
    adminLogin,
    adminLogout,
    adminMe,
    getStats,
    getUserGrowth,
    getMentorIndustryStats,
    getUsers,
    getUserDetail,
    deleteUser,
    blockUser,
    unblockUser,
    getEngagementStats,
    getEngagements,
  };
};

module.exports = createAdminController;
