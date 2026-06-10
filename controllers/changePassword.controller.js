/**
 * @fileoverview User Authentication and Account Security Controller
 * @description  Thin request/response handlers managing account security credentials,
 * session lifecycles, and user password modifications.
 */

const catchAsync = require("../utils/catchAsync");
const { changeUserPassword } = require("../services/auth.service");

/**
 * Modify and update the authenticated user's account password.
 * @route   PUT /api/v1/auth/change-password
 * @access  Private (User)
 */
const changePassword = catchAsync(async (req, res) => {
  await changeUserPassword(req.user._id, req.body);

  res.status(200).json({
    success: true,
    message: "Password changed successfully.",
  });
});

module.exports = { changePassword };
