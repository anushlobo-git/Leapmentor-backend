
/**
 * @fileoverview Admin Controller Dashboard
 * @description  Consolidated thin request/response handlers for admin authentication, 
 * platform telemetry statistics, user interventions, and connection metrics.
 */

const catchAsync = require("../utils/catchAsync");
const { adminLoginService } = require("../services/admin.auth.service");
const {
  getStatsService,
  getUserGrowthService,
  getMentorIndustryStatsService,
} = require("../services/admin.stats.service");
const {
  getUsersService,
  getUserDetailService,
  deleteUserService,
  blockUserService,
  unblockUserService,
} = require("../services/admin.users.service");
const {
  getEngagementStatsService,
  getEngagementsService,
} = require("../services/admin.engagements.service");

// Configured tracking constants
const MAX_COOKIE_AGE_HOURS = 8;
const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: MAX_COOKIE_AGE_HOURS * 60 * 60 * 1000,
};

// ── AUTHENTICATION HANDLERS ───────────────────────────────────

/**
 * Authenticate administrative credentials and issue a secure cookie session.
 * @route   POST /api/v1/admin/auth/login
 * @access  Public
 */
const adminLogin = catchAsync(async (req, res) => {
  const { token, admin } = await adminLoginService(req.body);
  res.cookie("adminToken", token, ADMIN_COOKIE_OPTIONS);
  res.status(200).json({ success: true, admin });
});

/**
 * Destroy the active administrative cookie session.
 * @route   POST /api/v1/admin/auth/logout
 * @access  Private (Admin)
 */
const adminLogout = (req, res) => {
  res.clearCookie("adminToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({ success: true, message: "Logged out." });
};

/**
 * Fetch the profile data of the currently authenticated administrator.
 * @route   GET /api/v1/admin/auth/me
 * @access  Private (Admin)
 */
const adminMe = catchAsync(async (req, res) => {
  res.status(200).json({ admin: req.admin });
});

// ── TELEMETRY STATS HANDLERS ──────────────────────────────────

/**
 * Retrieve high-level operational user counts and current month statistics.
 * @route   GET /api/v1/admin/stats
 * @access  Private (Admin)
 */
const getStats = catchAsync(async (req, res) => {
  const result = await getStatsService();
  res.status(200).json(result);
});

/**
 * Retrieve aggregated user onboarding metrics across the past quarter.
 * @route   GET /api/v1/admin/stats/user-growth
 * @access  Private (Admin)
 */
const getUserGrowth = catchAsync(async (req, res) => {
  const result = await getUserGrowthService();
  res.status(200).json(result);
});

/**
 * Retrieve breakdowns of registered mentors indexed by operational industry.
 * @route   GET /api/v1/admin/stats/mentor-industries
 * @access  Private (Admin)
 */
const getMentorIndustryStats = catchAsync(async (req, res) => {
  const result = await getMentorIndustryStatsService();
  res.status(200).json(result);
});

// ── USER MANAGEMENT HANDLERS ─────────────────────────────────

/**
 * Fetch a query-filtered, paginated ledger of platform users.
 * @route   GET /api/v1/admin/users
 * @access  Private (Admin)
 */
const getUsers = catchAsync(async (req, res) => {
  const result = await getUsersService(req.query);
  res.status(200).json(result);
});

/**
 * Fetch detailed biographical and performance information for an isolated profile record.
 * @route   GET /api/v1/admin/users/:userId
 * @access  Private (Admin)
 */
const getUserDetail = catchAsync(async (req, res) => {
  const result = await getUserDetailService(req.params.userId);
  res.status(200).json(result);
});

/**
 * Hard-delete a targeted user record along with all associated structural profile ties.
 * @route   DELETE /api/v1/admin/users/:userId
 * @access  Private (Super Admin Only)
 */
const deleteUser = catchAsync(async (req, res) => {
  const { name, email } = await deleteUserService(req.params.userId);
  res.status(200).json({
    success: true,
    message: `User ${name} (${email}) has been permanently deleted.`,
  });
});

/**
 * Restrict platform system access permissions for a specific user ID.
 * @route   PATCH /api/v1/admin/users/:userId/block
 * @access  Private (Admin)
 */
const blockUser = catchAsync(async (req, res) => {
  const { name } = await blockUserService(req.params.userId);
  res.status(200).json({ success: true, message: `User ${name} has been blocked.` });
});

/**
 * Restore standard account access capabilities for a flagged, blocked user ID.
 * @route   PATCH /api/v1/admin/users/:userId/unblock
 * @access  Private (Admin)
 */
const unblockUser = catchAsync(async (req, res) => {
  const { name } = await unblockUserService(req.params.userId);
  res.status(200).json({ success: true, message: `User ${name} has been restored.` });
});

// ── SYSTEM ENGAGEMENT HANDLERS ────────────────────────────────

/**
 * Fetch quantitative volumes of connection requests indexed by operational lifecycle statuses.
 * @route   GET /api/v1/admin/engagements/stats
 * @access  Private (Admin)
 */
const getEngagementStats = catchAsync(async (req, res) => {
  const result = await getEngagementStatsService();
  res.status(200).json(result);
});

/**
 * Fetch a paginated, date-bounded history of connection engagements.
 * @route   GET /api/v1/admin/engagements
 * @access  Private (Admin)
 */
const getEngagements = catchAsync(async (req, res) => {
  const result = await getEngagementsService(req.query);
  res.status(200).json(result);
});

module.exports = {
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

