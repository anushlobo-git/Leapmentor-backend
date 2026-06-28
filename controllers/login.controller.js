/**
 * @fileoverview User Login Controller
 * @description Thin request/response handlers verifying active client profiles,
 * managing secure state cookies, and returning application authentication session keys via dependency injection.
 */

const catchAsync = require("../utils/catchAsync");

const createLoginController = ({ authService, cookieUtils }) => {
  /**
   * Verify provided credentials to authenticate a platform user session.
   * @route   POST /api/v1/auth/login
   * @access  Public
   */
  const login = catchAsync(async (req, res, next) => {
    const result = await authService.loginUser(req.body);

    const role = result.user?.roles?.[0] || null;
    cookieUtils.setAuthCookies(res, result.refreshToken, role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  return { login };
};

module.exports = createLoginController;
