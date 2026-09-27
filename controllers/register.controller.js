/**
 * @fileoverview User Account Registration Controller
 * @description Thin request/response handlers orchestrating new user account provisioning,
 * secure asset wallet setups, and initial authentication session issuing via dependency injection.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");
const { getPrimaryRole } = require("../constants/roles");

const createRegisterController = ({ authService, cookieUtils }) => {
  // Human-readable message per register outcome (the frontend routes off the
  // machine-readable `outcome` field, not this string).
  const OUTCOME_MESSAGES = {
    created: "Registered successfully",
    role_added: "Role added to your account",
    already_registered: "You already have an account for this role",
    login_required: "An account with this email already exists",
  };

  /**
   * Register / resolve a submission to the public register form.
   *
   * One email can hold multiple roles, so this endpoint no longer 409s on a
   * known email. It returns an `outcome` the client routes on:
   *   created | role_added | already_registered | login_required
   * (see authService.registerUser for the full contract).
   *
   * @route   POST /api/v1/auth/register
   * @access  Public
   */
  const register = catchAsync(async (req, res, next) => {
    const result = await authService.registerUser(req.body);

    // Only outcomes that actually start a session hand back a refresh token
    // (a brand-new account, or an existing verified account we just added a
    // role to). For those we set the auth cookies exactly like login does;
    // for the "go log in" outcomes we deliberately set nothing.
    if (result.refreshToken) {
      const role = getPrimaryRole(result.user?.roles);
      cookieUtils.setAuthCookies(res, result.refreshToken, role);
    }

    const status =
      result.outcome === "created" ? STATUS.CREATED : STATUS.OK;

    sendSuccess(
      res,
      {
        outcome: result.outcome,
        isNewUser: result.isNewUser,
        loggedIn: result.loggedIn,
        user: result.user,
        accessToken: result.accessToken,
        email: result.email,
      },
      OUTCOME_MESSAGES[result.outcome] || "Registered successfully",
      status,
    );
  });

  return { register };
};

module.exports = createRegisterController;
