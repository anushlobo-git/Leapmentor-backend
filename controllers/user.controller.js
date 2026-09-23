/**
 * @fileoverview User Self-Service Controller
 * @description Thin request/response handlers for a logged-in user's own account —
 * fetching your own profile, and (new) adding an additional role to your own
 * account. This is the concrete, user-facing capability that the old
 * "exactly one role per account" schema constraint made impossible.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");
const { toUserDTO } = require("../mappers/user.mapper");

const createUserController = ({ authService }) => {
  /**
   * Returns the authenticated user's own profile.
   * @route   GET /api/v1/users/me
   * @access  Private
   */
  const getMe = catchAsync(async (req, res) => {
    // Routed through the same DTO mapper every other user-facing response
    // uses, rather than returning the raw Mongoose document — keeps this
    // endpoint from being the one place that leaks internal fields.
    return sendSuccess(res, toUserDTO(req.user), "Current user");
  });

  /**
   * Adds an additional role (e.g. "mentor") to the CALLER'S OWN account.
   * Self-service only — the target account is always `req.user`, never an
   * id supplied in the request body, so this can never be used to grant a
   * role to someone else's account.
   * @route   PATCH /api/v1/users/me/roles
   * @access  Private
   */
  const addRole = catchAsync(async (req, res) => {
    const { role } = req.body;
    const updatedUser = await authService.addAccountRole(req.user, role);
    return sendSuccess(
      res,
      updatedUser,
      `"${role}" role added to your account.`,
    );
  });

  return {
    getMe,
    addRole,
  };
};

module.exports = createUserController;
