/**
 * @fileoverview Forgot Password Domain Controller
 * @description Extracts request bodies, routes variables downstream to security handlers, and returns standard JSON payloads.
 */

const catchAsync = require("../utils/catchAsync");

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
    return res.status(200).json(result);
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
    return res.status(200).json(result);
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
    return res.status(200).json(result);
  });

  return {
    sendForgotPasswordOtp,
    verifyResetOtp,
    resetPassword,
  };
};

module.exports = createForgotPasswordController;
