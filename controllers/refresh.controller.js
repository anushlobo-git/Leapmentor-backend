/**
 * @fileoverview Session Token Refresh Controller
 * @description Thin request/response handlers validating long-lived rotation tokens
 * to securely extend active client authorization sessions via parameter dependency injection.
 */

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const createRefreshController = (authUtils, jwt, config) => {
  /**
   * Evaluate an incoming rotation cookie token to issue a fresh short-term access key.
   * @route   POST /api/v1/auth/refresh
   * @access  Public
   */
  const refreshToken = catchAsync(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new AppError(
        "Refresh token parameter missing from secure payload contexts.",
        401,
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtRefreshSecret);
    } catch {
      throw new AppError(
        "Invalid or expired session refresh token reference.",
        403,
      );
    }

    const accessToken = authUtils.signAccessToken(decoded.id);

    res.status(200).json({
      success: true,
      accessToken,
    });
  });

  return { refreshToken };
};

module.exports = createRefreshController;
