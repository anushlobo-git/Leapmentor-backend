/**
 * @fileoverview Social Authentication Controller
 * @description Inverted request/response handlers for processing third-party
 * federated identity configurations (Google, LinkedIn) via dependency parameters.
 */

const catchAsync = require("../utils/catchAsync");

const createSocialAuthController = (socialAuthService, cookieUtils, logger) => {
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

      return res.status(200).json({
        message: "Social login successful",
        user: result.user,
        accessToken: result.accessToken,
        isNewUser: result.isNewUser,
      });
    } catch (err) {
      logger.warn("Social auth failed", { error: err.message });

      if (err.message === "TERMS_NOT_ACCEPTED") {
        return res
          .status(400)
          .json({ message: "You must accept terms to continue" });
      }

      // Forward unmapped or general operational exceptions directly to the main system error matrix
      next(err);
    }
  });

  return { socialAuth };
};

module.exports = createSocialAuthController;
