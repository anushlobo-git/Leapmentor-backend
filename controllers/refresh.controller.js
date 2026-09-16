/**
 * @fileoverview Session Token Refresh Controller
 * @description Thin request/response handlers validating long-lived rotation tokens
 * to securely extend active client authorization sessions via parameter dependency injection.
 */

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const { toUserDTO } = require("../mappers/user.mapper");

const createRefreshController = ({ authUtils, jwt, config, userRepository }) => {
  /**
   * Evaluate an incoming rotation cookie token to issue a fresh short-term access key.
   * Also returns the full user DTO so new browser tabs can rehydrate Redux state
   * without requiring a separate login.
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

    const user = await userRepository.findUserById(decoded.id);
    if (!user) {
      throw new AppError("User account not found.", 401);
    }

    const accessToken = authUtils.signAccessToken(decoded.id);

    sendSuccess(res, { accessToken, user: toUserDTO(user) }, "Access token refreshed");
  });

  return { refreshToken };
};

module.exports = createRefreshController;
