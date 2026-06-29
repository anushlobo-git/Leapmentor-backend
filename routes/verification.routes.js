/**
 * @fileoverview User Account Verification and Core Communications Channels Delivery Routes Framework
 * @description Configures pipeline paths mounting declarative celebrate input processing filters via injection.
 */

const express = require("express");

const createVerificationRoutes = ({ verificationController, validations }) => {
  const router = express.Router();
  const { emailPayloadValidation, verifyOtpValidation, verifyLinkValidation } =
    validations;

  // @route   POST /api/v1/verification/send
  router.post(
    "/send",
    emailPayloadValidation,
    verificationController.sendVerification,
  );

  // @route   POST /api/v1/verification/resend
  router.post(
    "/resend",
    emailPayloadValidation,
    verificationController.resendVerification,
  );

  // @route   POST /api/v1/verification/verify-otp
  router.post(
    "/verify-otp",
    verifyOtpValidation,
    verificationController.verifyOtp,
  );

  // @route   GET /api/v1/verification/verify/:token
  router.get(
    "/verify/:token",
    verifyLinkValidation,
    verificationController.verifyLink,
  );

  return router;
};

module.exports = createVerificationRoutes;
