/**
 * @fileoverview Forgot Password Domain Controller
 * @description Extracts request bodies, routes variables downstream to security handlers, and returns standard JSON payloads.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");

const createForgotPasswordController = ({ forgotPasswordService }) => {
  /**
   * Dispatches an account recovery numeric security code toward target user email profiles.
   * @route   POST /api/v1/auth/forgot-password
   * @access  Public
   */
  const sendForgotPasswordOtp = catchAsync(async (req, res, next) => {
    const result = await forgotPasswordService.sendForgotPasswordOtp(
      req.body.email,
    );
    return sendSuccess(res, result, "Password reset OTP sent");
  });

  /**
   * Validates dynamic temporary numeric authentication codes against stored profile data hashes.
   * @route   POST /api/v1/auth/verify-reset-otp
   * @access  Public
   */
  const verifyResetOtp = catchAsync(async (req, res, next) => {
    const result = await forgotPasswordService.verifyResetOtp(
      req.body.email,
      req.body.otp,
    );
    return sendSuccess(res, result, "Reset OTP verified");
  });

  /**
   * Rewrites account password fields with new parameters following verified confirmation.
   * @route   POST /api/v1/auth/reset-password
   * @access  Public
   */
  const resetPassword = catchAsync(async (req, res, next) => {
    const result = await forgotPasswordService.resetPassword({
      email: req.body.email,
      otp: req.body.otp,
      newPassword: req.body.newPassword,
    });
    return sendSuccess(res, result, "Password reset successfully");
  });

  return {
    sendForgotPasswordOtp,
    verifyResetOtp,
    resetPassword,
  };
};

module.exports = createForgotPasswordController;
