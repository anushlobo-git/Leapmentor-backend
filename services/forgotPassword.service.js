/**
 * @fileoverview Forgot Password Service
 * @description Handles core business rules for secure identity authentication verification, OTP generation, and safe cryptographic updates.
 */
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const AppError = require("../utils/AppError");

// Repositories
const userRepo = require("../repositories/user.repository");
const verificationTokenRepo = require("../repositories/verificationToken.repository");

// Domain Constants
const BCRYPT_SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;
const AMBIGUOUS_SUCCESS_MESSAGE = "If this email exists, an OTP has been sent.";

const INITIAL_OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const EXTENDED_VERIFIED_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Helper: Generates a cryptographically secure 6-digit OTP.
 * @private
 * @returns {string} A random 6-digit number as a string.
 */
const generateSecureOtp = () => {
  const randomBuffer = crypto.getRandomValues(new Uint8Array(6));
  const randomNum =
    randomBuffer[0] * 10000 +
    (randomBuffer[1] % 10) * 1000 +
    (randomBuffer[2] % 10) * 100 +
    (randomBuffer[3] % 10) * 10 +
    (randomBuffer[4] % 10);
  return String(randomNum % 1000000).padStart(6, "0");
};

// Configuration Mailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generates and delivers an authentication OTP string to requested user profiles.
 * @description Normalizes structural input configurations, searches profiles securely
 * without exposing existence flags, updates ledger tokens cryptographically,
 * and handles dispatching HTML mailers asynchronously.
 * @param {string} email Target account identity pointer to route recovery assets toward.
 * @throws {AppError} 400
 * @returns {Promise<Object>} Ambiguous success string protecting against account enumeration vectors.
 */
const sendForgotPasswordOtp = async (email) => {
  if (!email) throw new AppError("email is required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userRepo.findUserByEmail(normalizedEmail);

  // Security best practice: do not leak account existence status to the client
  if (!user) {
    return { message: AMBIGUOUS_SUCCESS_MESSAGE };
  }

  await verificationTokenRepo.deleteTokensByUserId(user._id);

  const otpPlain = generateSecureOtp();
  const otpHash = await bcrypt.hash(otpPlain, BCRYPT_SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + INITIAL_OTP_EXPIRY_MS);

  await verificationTokenRepo.createToken({
    user: user._id,
    otp: otpHash,
    expiresAt,
  });

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: user.email,
    subject: "LeapMentor — Reset your password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 32px;">
          <h1 style="color: #fff; font-size: 20px; font-weight: 700; margin: 0;">Reset Your Password</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 6px 0 0;">LeapMentor account recovery</p>
        </div>
        <div style="padding: 28px 32px;">
          <p style="font-size: 14px; color: #475569; margin: 0 0 20px;">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1e293b; margin: 0;">${otpPlain}</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });

  return { message: AMBIGUOUS_SUCCESS_MESSAGE };
};

/**
 * Validates dynamic short-lived security numbers against hashed database storage profiles.
 * @description Validates target fields, checks timeline bounds, performs zero-leak comparisons,
 * and signs short temporary verification windows allowing password alterations.
 * @param {string} email Targeted core identity account map context.
 * @param {string} otp User supplied numeric verification asset token string.
 * @throws {AppError} 400
 * @returns {Promise<Object>} Confirmed structural validation metrics description array.
 */
const verifyResetOtp = async (email, otp) => {
  if (!email || !otp) throw new AppError("email and otp are required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userRepo.findUserByEmail(normalizedEmail);
  if (!user) throw new AppError("Invalid OTP", 400);

  const record = await verificationTokenRepo.findTokenByUserId(user._id);
  if (!record?.otp) {
    throw new AppError(
      "No reset request found. Please request a new OTP.",
      400,
    );
  }

  if (record.expiresAt < new Date()) {
    await verificationTokenRepo.deleteTokensByUserId(user._id);
    throw new AppError("OTP expired. Please request a new one.", 400);
  }

  const isOtpValid = await bcrypt.compare(String(otp).trim(), record.otp);
  if (!isOtpValid) throw new AppError("Invalid OTP", 400);

  // Mark token verified by extending the lifetime explicitly for password rewrite actions
  record.expiresAt = new Date(Date.now() + EXTENDED_VERIFIED_EXPIRY_MS);
  await verificationTokenRepo.saveToken(record);

  return { message: "OTP verified", email: normalizedEmail };
};

/**
 * Implements final step user credential updates following deep cross-verification checks.
 * @description Restricts minimum password length bounds, validates session parameters,
 * guarantees step constraints, cryptographically rewrites passwords,
 * and clears transient validation structures out of database memory completely.
 * @param {Object} data Core execution update parameters map.
 * @param {string} data.email Associated account configuration tracking identification.
 * @param {string} data.otp Reference validation numeric code tracking token.
 * @param {string} data.newPassword Plain text structural password updates targeting assignment.
 * @throws {AppError} 400
 * @returns {Promise<Object>} Complete success description metrics tracker array.
 */
const resetPassword = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword)
    throw new AppError("email, otp and newPassword are required", 400);
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      400,
    );
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userRepo.findUserByEmail(normalizedEmail);
  if (!user) throw new AppError("Invalid request", 400);

  const record = await verificationTokenRepo.findTokenByUserId(user._id);
  if (!record?.otp)
    throw new AppError("Session expired. Please start over.", 400);

  if (record.expiresAt < new Date()) {
    await verificationTokenRepo.deleteTokensByUserId(user._id);
    throw new AppError("Session expired. Please start over.", 400);
  }

  const isSessionValid = await bcrypt.compare(String(otp).trim(), record.otp);
  if (!isSessionValid)
    throw new AppError("Invalid session. Please start over.", 400);

  user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await userRepo.saveUser(user);

  await verificationTokenRepo.deleteTokensByUserId(user._id);

  return { message: "Password reset successfully. You can now login." };
};

module.exports = {
  sendForgotPasswordOtp,
  verifyResetOtp,
  resetPassword,
};
