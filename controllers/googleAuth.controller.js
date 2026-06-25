/**
 * @fileoverview Google Authentication Controller
 * @description Inverted network interface wrapper parsing inputs and binding cookie payloads
 * across federated signups via dependency parameter injection.
 */

const catchAsync = require("../utils/catchAsync");

const createGoogleAuthController = (googleAuthService, cookieUtils) => {
  /**
   * Handles incoming federated Google authentication tokens.
   * @route   POST /api/v1/auth/google
   * @access  Public
   */
  const googleAuth = catchAsync(async (req, res, next) => {
    const result = await googleAuthService.googleAuthUser({
      credential: req.body.credential,
      roles: req.body.roles,
      termsAccepted: req.body.termsAccepted,
    });

    const primaryRole = result.user?.roles?.[0] || null;
    cookieUtils.setAuthCookies(res, result.refreshToken, primaryRole);

    res.status(200).json({
      message: "Google login successful",
      user: result.user,
      accessToken: result.accessToken,
      isNewUser: result.isNewUser,
    });
  });

  return { googleAuth };
};

module.exports = createGoogleAuthController;
