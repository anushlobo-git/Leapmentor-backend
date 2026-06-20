/**
 * @fileoverview Verification Domain Transport Gateway Controller
 * @description Thin network pipeline interface validating entry signatures and processing JSON outputs status mappings.
 */
const catchAsync = require("../utils/catchAsync");
const verificationService = require("../services/verification.service");

/**
 * Dispatches an automated multi-option token challenge layout to the destination user email.
 * @route   POST /api/v1/verification/send
 * @access  Public
 */
const sendVerification = catchAsync(async (req, res) => {
  await verificationService.initiateVerification(req.body.email);
  res
    .status(200)
    .json({ message: "Verification email sent (OTP + magic link)" });
});

/**
 * Clears old verification history rows and fires a re-delivery notification trigger.
 * @route   POST /api/v1/verification/resend
 * @access  Public
 */
const resendVerification = catchAsync(async (req, res) => {
  await verificationService.initiateVerification(req.body.email, " (Resend)");
  res
    .status(200)
    .json({ message: "Verification email resent (OTP + magic link)" });
});

/**
 * Assesses input verification codes, converting matched profiles verification keys to true.
 * @route   POST /api/v1/verification/verify-otp
 * @access  Public
 */
const verifyOtp = catchAsync(async (req, res) => {
  await verificationService.processOtpVerification(
    req.body.email,
    req.body.otp,
  );
  res.status(200).json({ message: "Email verified successfully" });
});

/**
 * Parses URL reference parameters to instantly activate incoming user accounts.
 * @route   GET /api/v1/verification/verify/:token
 * @access  Public
 */
const verifyLink = catchAsync(async (req, res) => {
  const result = await verificationService.processLinkVerification(
    req.params.token,
    req.query.email,
  );
  res.status(200).json({
    message: "Email verified successfully",
    role: result.role,
  });
});

module.exports = {
  sendVerification,
  resendVerification,
  verifyOtp,
  verifyLink,
};
