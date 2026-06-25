/**
 * @fileoverview User Authentication Framework Routes
 * @description Handles core account registration, secure login/logout sessions, session token refreshing,
 * password modification updates, and third-party social OAuth integrations (Google, LinkedIn) via injection.
 */

const express = require("express");

const createAuthRoutes = (controllers, validations, cookieUtils) => {
  const router = express.Router();

  const {
    registerController,
    loginController,
    googleAuthController,
    socialAuthController,
    refreshController,
    linkedinAuthController,
  } = controllers;

  const {
    registerValidation,
    loginValidation,
    googleAuthValidation,
    linkedinAuthValidation,
    refreshTokenCookieValidation,
  } = validations;

  // ── LOCAL AUTHENTICATION & SESSION MANAGEMENT ─────────────────

  // @route   POST /api/v1/auth/register
  router.post("/register", registerValidation, registerController.register);

  // @route   POST /api/v1/auth/login
  router.post("/login", loginValidation, loginController.login);

  // @route   POST /api/v1/auth/refresh
  router.post(
    "/refresh",
    refreshTokenCookieValidation,
    refreshController.refreshToken,
  );

  // @route   POST /api/v1/auth/logout
  router.post("/logout", (req, res) => {
    cookieUtils.clearAuthCookies(res);
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  });

  // ── THIRD-PARTY OAUTH INTEGRATIONS ────────────────────────────

  // @route   POST /api/v1/auth/google
  router.post("/google", googleAuthValidation, googleAuthController.googleAuth);

  // @route   POST /api/v1/auth/social
  router.post("/social", socialAuthController.socialAuth);

  // @route   GET /api/v1/auth/linkedin
  router.get("/linkedin", linkedinAuthController.linkedinRedirect);

  // @route   GET /api/v1/auth/linkedin/callback
  router.get("/linkedin/callback", linkedinAuthController.linkedinCallback);

  // @route   POST /api/v1/auth/linkedin/token
  router.post(
    "/linkedin/token",
    linkedinAuthValidation,
    linkedinAuthController.linkedinAuth,
  );

  return router;
};

module.exports = createAuthRoutes;
