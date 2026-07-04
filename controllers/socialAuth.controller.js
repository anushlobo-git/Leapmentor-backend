/**
 * @fileoverview Social Authentication Controller
 * @description Inverted request/response handlers for processing third-party
 * federated identity configurations (Google, LinkedIn) via dependency parameters.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, sendError, STATUS } = require("../utils/apiResponse");

const createSocialAuthController = ({ socialAuthService, cookieUtils, logger }) => {
  /**
   * Process incoming federated identity criteria to establish secure user sessions.
   * @route   POST /api/v1/auth/social
   * @access  Public
   */
  const socialAuth = catchAsync(async (req, res, next) => {
    try {
      const result = await socialAuthService.socialAuthUser(req.body);

      // Extract authorization metadata and hand over parameters to injected cookie managers
      const role = result.user?.roles?.[0] || null;
      cookieUtils.setAuthCookies(res, result.refreshToken, role);

      return sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          isNewUser: result.isNewUser,
        },
        "Social login successful",
      );
    } catch (err) {
      logger.warn("Social auth failed", { error: err.message });

      if (err.message === "TERMS_NOT_ACCEPTED") {
        return sendError(
          res,
          "You must accept terms to continue",
          STATUS.BAD_REQUEST,
        );
      }

      // Forward unmapped or general operational exceptions directly to the main system error matrix
      next(err);
    }
  });

  return { socialAuth };
};

module.exports = createSocialAuthController;
