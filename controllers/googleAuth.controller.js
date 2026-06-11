/**
 * @fileoverview Google Authentication Controller
 * @description Thin network interface wrapper parsing inputs and binding cookie payloads across federated signups.
 */
const catchAsync = require("../utils/catchAsync");
const { googleAuthUser } = require("../services/googleAuth.service");
const { setAuthCookies } = require("../utils/auth.cookies");

/**
 * Handles incoming federated Google authentication tokens.
 * @route   POST /api/v1/auth/google
 * @access  Public
 */
const googleAuth = catchAsync(async (req, res) => {
  const result = await googleAuthUser({
    credential: req.body.credential,
    roles: req.body.roles,
    termsAccepted: req.body.termsAccepted,
  });

  const primaryRole = result.user?.roles?.[0] || null;
  setAuthCookies(res, result.refreshToken, primaryRole);

  res.status(200).json({
    message: "Google login successful",
    user: result.user,
    accessToken: result.accessToken,
    isNewUser: result.isNewUser,
  });
});

module.exports = { googleAuth };
