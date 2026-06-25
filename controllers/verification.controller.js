/**
 * @fileoverview Verification Domain Transport Gateway Controller
 * @description Thin network pipeline interface validating entry signatures and processing JSON outputs status mappings.
 */

const catchAsync = require("../utils/catchAsync");

const createVerificationController = (verificationService) => {
  const sendVerification = catchAsync(async (req, res, next) => {
    await verificationService.initiateVerification(req.body.email);
    return res
      .status(200)
      .json({ message: "Verification email sent (OTP + magic link)" });
  });

  const resendVerification = catchAsync(async (req, res, next) => {
    await verificationService.initiateVerification(req.body.email, " (Resend)");
    return res
      .status(200)
      .json({ message: "Verification email resent (OTP + magic link)" });
  });

  const verifyOtp = catchAsync(async (req, res, next) => {
    await verificationService.processOtpVerification(
      req.body.email,
      req.body.otp,
    );
    return res.status(200).json({ message: "Email verified successfully" });
  });

  const verifyLink = catchAsync(async (req, res, next) => {
    const result = await verificationService.processLinkVerification(
      req.params.token,
      req.query.email,
    );
    return res.status(200).json({
      message: "Email verified successfully",
      role: result.role,
    });
  });

  return {
    sendVerification,
    resendVerification,
    verifyOtp,
    verifyLink,
  };
};

module.exports = createVerificationController;
