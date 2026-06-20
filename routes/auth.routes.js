/**
 * @fileoverview User Authentication Framework Routes
 * @description  Handles core account registration, secure login/logout sessions, session token refreshing,
 * password modification updates, and third-party social OAuth integrations (Google, LinkedIn).
 * @prefix       /api/v1/auth
 * @access       Public / Private (User)
 */

const express = require("express");
const router = express.Router();

const { register } = require("../controllers/register.controller");
const { login } = require("../controllers/login.controller");
const { googleAuth } = require("../controllers/googleAuth.controller");
const { socialAuth } = require("../controllers/socialAuth.controller");
const { changePassword } = require("../controllers/changePassword.controller");
const { authenticate } = require("../middleware/authenticate");
const { clearAuthCookies } = require("../utils/auth.cookies");
const { refreshToken } = require("../controllers/refresh.controller");
const { registerValidation, loginValidation } = require("../validations/auth.validation");
const {
  linkedinRedirect,
  linkedinCallback,
  linkedinAuth,
} = require("../controllers/linkedinAuth.controller");

// --- LOCAL AUTHENTICATION & SESSION MANAGEMENT ---

// @route   POST /api/v1/auth/register
router.post("/register", registerValidation, register);

// @route   POST /api/v1/auth/login
router.post("/login", loginValidation, login);

// @route   POST /api/v1/auth/refresh
router.post("/refresh", refreshToken);

// @route   POST /api/v1/auth/logout
router.post("/logout", (req, res) => {
  clearAuthCookies(res);
  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
});

// @route   PUT /api/v1/auth/change-password
router.put("/change-password", authenticate, changePassword);

// --- THIRD-PARTY OAUTH INTEGRATIONS ---

// @route   POST /api/v1/auth/google
router.post("/google", googleAuth);

// @route   POST /api/v1/auth/social
router.post("/social", socialAuth);

// @route   GET /api/v1/auth/linkedin
router.get("/linkedin", linkedinRedirect);

// @route   GET /api/v1/auth/linkedin/callback
router.get("/linkedin/callback", linkedinCallback);

// @route   POST /api/v1/auth/linkedin/token
router.post("/linkedin/token", linkedinAuth);

module.exports = router;
