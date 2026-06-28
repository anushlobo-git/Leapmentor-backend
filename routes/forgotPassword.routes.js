/**
 * @fileoverview Password Recovery Routes
 * @description Handles verification token generations, OTP authentications, and user password reset operations.
 */

const express = require("express");

const createForgotPasswordRoutes = ({ forgotPasswordController, validations }) => {
  const router = express.Router();

  const {
    sendForgotPasswordOtpValidation,
    verifyResetOtpValidation,
    resetPasswordValidation,
  } = validations;

  // @route   POST /api/v1/auth/forgot-password
  router.post(
    "/forgot-password",
    sendForgotPasswordOtpValidation,
    forgotPasswordController.sendForgotPasswordOtp,
  );

  // @route   POST /api/v1/auth/verify-reset-otp
  router.post(
    "/verify-reset-otp",
    verifyResetOtpValidation,
    forgotPasswordController.verifyResetOtp,
  );

  // @route   POST /api/v1/auth/reset-password
  router.post(
    "/reset-password",
    resetPasswordValidation,
    forgotPasswordController.resetPassword,
  );

  return router;
};

module.exports = createForgotPasswordRoutes;
