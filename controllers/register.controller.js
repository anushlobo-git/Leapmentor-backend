/**
 * @fileoverview User Account Registration Controller
 * @description Thin request/response handlers orchestrating new user account provisioning,
 * secure asset wallet setups, and initial authentication session issuing via dependency injection.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");
const { getPrimaryRole } = require("../constants/roles");

const createRegisterController = ({ authService, cookieUtils }) => {
  /**
   * Register and provision a brand-new user profile account.
   * @route   POST /api/v1/auth/register
   * @access  Public
   */
  const register = catchAsync(async (req, res, next) => {
    const result = await authService.registerUser(req.body);

    // Which role drives the routing-hint cookie is now a config decision
    // (constants/roles.js ROLE_PRIORITY), not a hardcoded "take the first
    // one" — correct even for an account that holds several roles.
    const role = getPrimaryRole(result.user?.roles);
    cookieUtils.setAuthCookies(res, result.refreshToken, role);

    sendSuccess(
      res,
      {
        user: result.user,
        isNewUser: result.isNewUser,
        accessToken: result.accessToken,
      },
      "Registered successfully",
      STATUS.CREATED,
    );
  });

  return { register };
};

module.exports = createRegisterController;
