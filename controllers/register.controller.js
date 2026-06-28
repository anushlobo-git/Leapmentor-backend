/**
 * @fileoverview User Account Registration Controller
 * @description Thin request/response handlers orchestrating new user account provisioning,
 * secure asset wallet setups, and initial authentication session issuing via dependency injection.
 */

const catchAsync = require("../utils/catchAsync");

const createRegisterController = ({ authService, cookieUtils }) => {
  /**
   * Register and provision a brand-new user profile account.
   * @route   POST /api/v1/auth/register
   * @access  Public
   */
  const register = catchAsync(async (req, res, next) => {
    const result = await authService.registerUser(req.body);

    const role = result.user?.roles?.[0] || null;
    cookieUtils.setAuthCookies(res, result.refreshToken, role);

    res.status(201).json({
      success: true,
      message: "Registered successfully",
      user: result.user,
      isNewUser: result.isNewUser,
      accessToken: result.accessToken,
    });
  });

  return { register };
};

module.exports = createRegisterController;
