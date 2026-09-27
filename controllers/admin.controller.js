/**
 * @fileoverview Admin Controller Dashboard
 * @description Consolidated thin request/response handlers for admin authentication,
 * platform telemetry statistics, user interventions, and connection metrics. Receives injected systems.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");
const env = require("../config/env");

const CACHE_TTL_SECONDS = 300; // 5-Minute corporate caching standard window

// 15 minutes — matches ACCESS_TOKEN_EXPIRES_IN in admin.service.js
const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
// 7 days — matches REFRESH_TOKEN_EXPIRES_IN in admin.service.js
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "strict",
};

const ACCESS_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: ACCESS_COOKIE_MAX_AGE_MS,
};

// Scoped so the refresh token is only ever sent to auth endpoints, not
// attached to every /admin/* request the browser makes.
const REFRESH_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  path: "/api/v1/admin/auth",
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
  cacheUtility,
}) => {
  // ── AUTHENTICATION HANDLERS ─────────────────────────────────

  /**
   * Authenticates administrative credentials and drops httpOnly access +
   * refresh session cookies.
   * @route   POST /api/v1/admin/auth/login
   * @access  Public
   * @param {import('express').Request} req - Express request object containing req.body.email and req.body.password.
   * @param {import('express').Response} res - Express response object used to set session cookies.
   * @returns {Promise<void>} Resolves after success envelope is sent.
   */
  const adminLogin = catchAsync(async (req, res) => {
    const { accessToken, refreshToken, admin } =
      await adminAuthService.adminLoginService(req.body);
    res.cookie("adminToken", accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("adminRefreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    sendSuccess(res, { admin }, "Admin login successful");
  });

  /**
   * Silently rotates the access token (and refresh token) using the
   * long-lived adminRefreshToken cookie, without requiring the admin to
   * re-enter credentials.
   * @route   POST /api/v1/admin/auth/refresh
   * @access  Public (requires a valid adminRefreshToken cookie)
   * @param {import('express').Request} req - Express request object.
   * @param {import('express').Response} res - Express response object used to set rotated session cookies.
   * @returns {Promise<void>} Resolves after success envelope is sent.
   */
  const adminRefresh = catchAsync(async (req, res) => {
    const { accessToken, refreshToken } =
      await adminAuthService.refreshAdminTokenService(
        req.cookies?.adminRefreshToken,
      );
    res.cookie("adminToken", accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("adminRefreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    sendSuccess(res, null, "Session refreshed");
  });

  /**
   * Revokes the admin's current session (bumps tokenVersion server-side,
   * invalidating the refresh token immediately) and clears both cookies.
   * @route   POST /api/v1/admin/auth/logout
   * @access  Public
   * @param {import('express').Request} req - Express request object.
   * @param {import('express').Response} res - Express response object used to clear session cookies.
   * @returns {Promise<void>} Resolves after success envelope is sent.
   */
  const adminLogout = catchAsync(async (req, res) => {
    await adminAuthService.adminLogoutService(req.cookies?.adminRefreshToken);
    res.clearCookie("adminToken", BASE_COOKIE_OPTIONS);
    res.clearCookie("adminRefreshToken", {
      ...BASE_COOKIE_OPTIONS,
      path: "/api/v1/admin/auth",
    });
    sendSuccess(res, null, "Logged out.");
  });

  /**
   * Retrieves the current verified administrator session state context.
   * @route   GET /api/v1/admin/auth/me
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
   * @route   GET /api/v1/admin/stats
   * @access  Private (Admin)
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
   * @route   GET /api/v1/admin/user-growth
   * @access  Private (Admin)
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
   * @route   GET /api/v1/admin/stats/mentor-industries
   * @access  Private (Admin)
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
   * @route   GET /api/v1/admin/users
   * @access  Private (Admin)
   */
  const getUsers = catchAsync(async (req, res) => {
    const result = await adminUserService.getUsersService(req.query);
    sendSuccess(res, result, "Users retrieved");
  });

  /**
   * Locates detailed biographical, status, and role metadata regarding an isolated user record.
   * @route   GET /api/v1/admin/users/:userId
   * @access  Private (Admin)
   */
  const getUserDetail = catchAsync(async (req, res) => {
    const result = await adminUserService.getUserDetailService(
      req.params.userId,
    );
    sendSuccess(res, result, "User details retrieved");
  });

  /**
   * Revokes workspace accessibility clearances by flag-modifying a profile as blocked.
   * @route   PATCH /api/v1/admin/users/:userId/block
   * @access  Private (Admin)
   */
  const blockUser = catchAsync(async (req, res) => {
    const { name } = await adminUserService.blockUserService(req.params.userId);
    sendSuccess(res, null, `User ${name} has been blocked.`);
  });

  /**
   * Re-authorizes clearance boundaries on a blocked workspace document profile.
   * @route   PATCH /api/v1/admin/users/:userId/unblock
   * @access  Private (Admin)
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
   * @route   GET /api/v1/admin/engagements/stats
   * @access  Private (Admin)
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
   * @route   GET /api/v1/admin/engagements
   * @access  Private (Admin)
   */
  const getEngagements = catchAsync(async (req, res) => {
    const result = await adminEngagementService.getEngagementsService(
      req.query,
    );
    sendSuccess(res, result, "Engagements retrieved");
  });

  return {
    adminLogin,
    adminRefresh,
    adminLogout,
    adminMe,
    getStats,
    getUserGrowth,
    getMentorIndustryStats,
    getUsers,
    getUserDetail,
    blockUser,
    unblockUser,
    getEngagementStats,
    getEngagements,
  };
};

module.exports = createAdminController;
