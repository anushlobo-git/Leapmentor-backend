/**
 * @fileoverview User Account Verification and Core Communications Channels Delivery Routes Framework
 * @prefix       /api/v1/verification
 * @access       Public
 */
const express = require("express");
const router = express.Router();
const {
  sendVerification,
  resendVerification,
  verifyOtp,
  verifyLink,
} = require("../controllers/verification.controller");

// @route   POST /api/v1/verification/send
router.post("/send", sendVerification);

// @route   POST /api/v1/verification/resend
router.post("/resend", resendVerification);

// @route   POST /api/v1/verification/verify-otp
router.post("/verify-otp", verifyOtp);

// @route   GET /api/v1/verification/verify/:token
router.get("/verify/:token", verifyLink);

module.exports = router;
