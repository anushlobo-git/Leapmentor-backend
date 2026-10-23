/**
 * @fileoverview User Login Controller
 * @description Thin request/response handlers verifying active client profiles,
 * managing secure state cookies, and returning application authentication session keys via dependency injection.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");

const createLoginController = ({ authService, cookieUtils }) => {
  /**
   * Verify provided credentials to authenticate a platform user session.
   * @route   POST /api/v1/auth/login
   * @access  Public
   */
  const login = catchAsync(async (req, res, next) => {
    const result = await authService.loginUser(req.body);

    cookieUtils.setAuthCookies(res, result.refreshToken);

    sendSuccess(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Login successful",
    );
  });

  return { login };
};

module.exports = createLoginController;
