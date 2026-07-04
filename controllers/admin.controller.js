/**
 * @fileoverview Admin Controller Dashboard
 * @description Consolidated thin request/response handlers for admin authentication,
 * platform telemetry statistics, user interventions, and connection metrics. Receives injected systems.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");
const env=require("../config/env");
// Configured tracking constants
const MAX_COOKIE_AGE_HOURS = 8;
const CACHE_TTL_SECONDS = 300; // 5-Minute corporate caching standard window
const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax",
  maxAge: MAX_COOKIE_AGE_HOURS * 60 * 60 * 1000,
};
/**
 * Factory function that initializes the Admin controller with its required service dependencies.
 * Uses dependency injection to enable decoupling and unit testing.
 *
 * @param {Object} dependencies - The service layer dependencies.
 * @param {Object} dependencies.adminAuthService - Service handling admin credentials and tokens.
 * @param {Object} dependencies.adminStatsService - Service compiling system telemetry data.
 * @param {Object} dependencies.adminUserService - Service executing profile compliance actions.
 * @param {Object} dependencies.adminEngagementService - Service managing connection contracts.
 * @param {Object} dependencies.cacheUtility - Utility managing redis/memory caching layers.
 * @returns {Object} An object containing all the initialized controller route handlers.
 */
const createAdminController = ({
  adminAuthService,
  adminStatsService,
  adminUserService,
  adminEngagementService,
  cacheUtility
}) => {
  // ── AUTHENTICATION HANDLERS ─────────────────────────────────

  /**
   * Authenticates administrative credentials and drops an httpOnly session cookie.
   * * @route   POST /api/v1/admin/auth/login
   * @access  Public
   * @param {import('express').Request} req - Express request object containing req.body.email and req.body.password.
   * @param {import('express').Response} res - Express response object used to set session cookies.
   * @returns {Promise<void>} Resolves after success envelope is sent.
   */

  const adminLogin = catchAsync(async (req, res) => {
    const { token, admin } = await adminAuthService.adminLoginService(req.body);
    res.cookie("adminToken", token, ADMIN_COOKIE_OPTIONS);
    sendSuccess(res, { admin }, "Admin login successful");
  });

  /**
   * Destroys the administrative httpOnly authorization session cookie.
   * * @route   POST /api/v1/admin/auth/logout
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request object.
   * @param {import('express').Response} res - Express response object used to clear session cookies.
   * @returns {void} Sends success envelope immediately.
   */

  const adminLogout = (req, res) => {
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
    });
    sendSuccess(res, null, "Logged out.");
  };
  
  /**
   * Retrieves the current verified administrator session state context.
   * * @route   GET /api/v1/admin/auth/me
   * @access  Private (Admin)
   * @param {import('express').Request & { admin: Object }} req - Express request attached with authenticated administrator meta object.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves after payload delivery.
   */
  
  const adminMe = catchAsync(async (req, res) => {
    sendSuccess(res, { admin: req.admin }, "Admin profile retrieved");
  });

  // ── TELEMETRY STATS HANDLERS ────────────────────────────────
  /**
   * Fetches high-level system telemetry counts with a 5-minute caching lifecycle layout.
   * * @route   GET /api/v1/admin/stats
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request object.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves with unified counter payloads.
   */

  const getStats = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:stats",
      CACHE_TTL_SECONDS,
      () => adminStatsService.getStatsService(),
    );
    sendSuccess(res, data, "Platform stats retrieved");
  });

  /**
   * Compiles chronological user registration volume scales for growth timelines.
   * * @route   GET /api/v1/admin/user-growth
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request object.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves with timeseries historical datasets.
   */

  const getUserGrowth = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:growth",
      CACHE_TTL_SECONDS,
      () => adminStatsService.getUserGrowthService(),
    );
    sendSuccess(res, data, "User growth data retrieved");
  });

  /**
   * Captures segmented distributions of active mentors mapped against market industrial verticals.
   * * @route   GET /api/v1/admin/stats/mentor-industries
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request object.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves with classification metric sets.
   */

  const getMentorIndustryStats = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:industries",
      CACHE_TTL_SECONDS,
      () => adminStatsService.getMentorIndustryStatsService(),
    );
    sendSuccess(res, data, "Mentor industry stats retrieved");
  });

  // ── USER MANAGEMENT HANDLERS ────────────────────────────────

  /**
   * Gathers a searchable, filters-compliant list of registered platform user documents.
   * * @route   GET /api/v1/admin/users
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request containing filtering/sorting parameters inside req.query.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves with paginated user records.
   */

  const getUsers = catchAsync(async (req, res) => {
    const result = await adminUserService.getUsersService(req.query);
    sendSuccess(res, result, "Users retrieved");
  });

  /**
   * Locates detailed biographical, status, and role metadata regarding an isolated user record.
   * * @route   GET /api/v1/admin/users/:userId
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request requiring parameter validation context inside req.params.userId.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves with a single compiled profile document payload.
   */

  const getUserDetail = catchAsync(async (req, res) => {
    const result = await adminUserService.getUserDetailService(
      req.params.userId,
    );
    sendSuccess(res, result, "User details retrieved");
  });

  /**
   * Destructively and permanently wipes out a target user profile file.
   * * @route   DELETE /api/v1/admin/users/:userId
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request containing target profile key inside req.params.userId.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves with zero payload upon completing purge operations.
   */

  const deleteUser = catchAsync(async (req, res) => {
    const { name, email } = await adminUserService.deleteUserService(
      req.params.userId,
    );
    sendSuccess(
      res,
      null,
      `User ${name} (${email}) has been permanently deleted.`,
    );
  });

   /**
   * Revokes workspace accessibility clearances by flag-modifying a profile as blocked.
   * * @route   PATCH /api/v1/admin/users/:userId/block
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request containing reference target inside req.params.userId.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves indicating constraint application.
   */

  const blockUser = catchAsync(async (req, res) => {
    const { name } = await adminUserService.blockUserService(req.params.userId);
    sendSuccess(res, null, `User ${name} has been blocked.`);
  });

  /**
   * Re-authorizes clearance boundaries on a blocked workspace document profile.
   * * @route   PATCH /api/v1/admin/users/:userId/unblock
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request targeting specific reference inside req.params.userId.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves indicating status restoration completes.
   */

  const unblockUser = catchAsync(async (req, res) => {
    const { name } = await adminUserService.unblockUserService(
      req.params.userId,
    );
    sendSuccess(res, null, `User ${name} has been restored.`);
  });

  // ── SYSTEM ENGAGEMENT HANDLERS ──────────────────────────────

  /**
   * Aggregates global processing operational statuses for engagement connection contracts.
   * * @route   GET /api/v1/admin/engagements/stats
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request object.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves delivering active engagement overview charts.
   */

  const getEngagementStats = catchAsync(async (req, res) => {
    const data = await cacheUtility.getOrSetCache(
      "admin:telemetry:engagements",
      CACHE_TTL_SECONDS,
      () => adminEngagementService.getEngagementStatsService(),
    );
    sendSuccess(res, data, "Engagement stats retrieved");
  });

  /**
   * Evaluates active, historical, or transactional workspace contracts across cross-functional bounds.
   * * @route   GET /api/v1/admin/engagements
   * @access  Private (Admin)
   * @param {import('express').Request} req - Express request tracking query filter profiles inside req.query.
   * @param {import('express').Response} res - Express response object.
   * @returns {Promise<void>} Resolves with list tracking summaries.
   */

  const getEngagements = catchAsync(async (req, res) => {
    const result = await adminEngagementService.getEngagementsService(
      req.query,
    );
    sendSuccess(res, result, "Engagements retrieved");
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
