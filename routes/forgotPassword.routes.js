/**
 * @fileoverview Password Recovery Routes
 * @description  Handles verification token generations, OTP authentications, and user password reset operations.
 * @prefix       /api/v1/auth
 * @access       Public
 */

const express = require("express");
const router = express.Router();
const {
  sendForgotPasswordOtp,
  verifyResetOtp,
  resetPassword,
} = require("../controllers/forgotPassword.controller");

// @route   POST /api/v1/auth/forgot-password
router.post("/forgot-password", sendForgotPasswordOtp);

// @route   POST /api/v1/auth/verify-reset-otp
router.post("/verify-reset-otp", verifyResetOtp);

// @route   POST /api/v1/auth/reset-password
router.post("/reset-password", resetPassword);

module.exports = router;
