/**
 * @fileoverview User Login Controller
 * @description  Thin request/response handlers verifying active client profiles,
 * managing secure state cookies, and returning application authentication session keys.
 */

const catchAsync = require("../utils/catchAsync");
const { loginUser } = require("../services/auth.service");
const { setAuthCookies } = require("../utils/auth.cookies");

// ── AUTHENTICATION HANDLERS ──────────────────────────────────

/**
 * Verify provided credentials to authenticate a platform user session.
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res) => {
  const result = await loginUser(req.body);

  const role = result.user?.roles?.[0] || null;
  setAuthCookies(res, result.refreshToken, role);

  res.status(200).json({
    success: true,
    message: "Login successful",
    user: result.user,
    accessToken: result.accessToken,
  });
});

module.exports = { login };
