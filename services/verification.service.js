/**
 * @fileoverview Verification Lifecycle Business Logic Service
 * @description Generates high-entropy crypto tokens, computes adaptive cryptographic hashes,
 * issues secure notification mail hooks, and enforces registration time blocks.
 */
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const AppError = require("../utils/AppError");

// Repositories
const userRepository = require("../repositories/user.repository");
const verificationTokenRepository = require("../repositories/verificationToken.repository");

// Upper-case Architecture Constant Options
const BCRYPT_SALT_ROUNDS = 10;
const TOKEN_LIFETIME_MS = 10 * 60 * 1000; // 10 Minutes window
const DEFAULT_SMTP_PORT = 587;
const OTP_GEN_FLOOR = 100000;
const OTP_GEN_CEILING = 900000;

// Initialize Transport Services Gateway
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/**
 * Internal Helper: Generates a cryptographically secure 6-digit numeric verification OTP code.
 * @private
 * @returns {string} A random 6-digit number as a string.
 */
const generateNumericOtp = () => {
  const randomBuffer = crypto.getRandomValues(new Uint8Array(6));
  const randomNum =
    randomBuffer[0] * 10000 +
    (randomBuffer[1] % 10) * 1000 +
    (randomBuffer[2] % 10) * 100 +
    (randomBuffer[3] % 10) * 10 +
    (randomBuffer[4] % 10);
  return String(randomNum % 1000000).padStart(6, "0");
};

/**
 * Internal Helper: Generates a high-entropy string reference key for secure magic links.
 * @private
 */
const generateHexToken = () => crypto.randomBytes(32).toString("hex");

/**
 * Generates validation signatures, secures entries in the database, and dispatches automated mail options.
 * @private
 */
const sendVerificationEmail = async (user, subjectSuffix = "") => {
  await verificationTokenRepository.deleteTokensByUserId(user._id);

  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);
  const plainOtp = generateNumericOtp();
  const plainToken = generateHexToken();

  const [hashedOtp, hashedToken] = await Promise.all([
    bcrypt.hash(plainOtp, BCRYPT_SALT_ROUNDS),
    bcrypt.hash(plainToken, BCRYPT_SALT_ROUNDS),
  ]);

  await verificationTokenRepository.createToken({
    user: user._id,
    otp: hashedOtp,
    token: hashedToken,
    expiresAt,
  });

  const appUrlBase = process.env.APP_BASE_URL || "http://localhost:5173";
  const magicLink = `${appUrlBase}/verify-email?token=${plainToken}&email=${encodeURIComponent(user.email)}`;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: user.email,
    subject: `LeapMentor Email Verification${subjectSuffix}`,
    text: `Verify your LeapMentor account\n\nOption 1 – Click the magic link (expires in 10 minutes):\n${magicLink}\n\nOption 2 – Enter this OTP manually (expires in 10 minutes):\n${plainOtp}`.trim(),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#4F46E5">Verify your LeapMentor account</h2>
        <p>Use either option — both expire in <strong>10 minutes</strong>.</p>
        <h3>Option 1 — Magic Link</h3>
        <a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Verify my email
        </a>
        <p style="font-size:12px;color:#6B7280">Or copy: ${magicLink}</p>
        <hr style="margin:24px 0"/>
        <h3>Option 2 — OTP</h3>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111">${plainOtp}</p>
        <p style="font-size:13px;color:#6B7280">Enter this on the verification screen.</p>
      </div>
    `,
  });
};

/**
 * Initiates account ownership verification workflows.
 * @param {string} rawEmail - User input text context identifier query.
 * @param {string} [subjectSuffix] - Conditional indicator string to mark resend timelines.
 * @throws {AppError} 400 | 404
 */
const initiateVerification = async (rawEmail, subjectSuffix = "") => {
  if (!rawEmail) {
    throw new AppError("email is required to process token distributions", 400);
  }

  const normalizedEmail = String(rawEmail).toLowerCase().trim();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(
      "Account record matching input email criteria not found",
      404,
    );
  }
  if (user.isEmailVerified) {
    throw new AppError(
      "Verification conflict: Target profile email is already verified",
      400,
    );
  }

  await sendVerificationEmail(user, subjectSuffix);
};

/**
 * Evaluates numeric inputs against encrypted token tables to authorize profiles.
 * @param {string} rawEmail
 * @param {string} rawOtp
 * @throws {AppError} 400 | 404
 */
const processOtpVerification = async (rawEmail, rawOtp) => {
  if (!rawEmail || !rawOtp) {
    throw new AppError(
      "Both email and otp strings values are required parameter parameters",
      400,
    );
  }

  const normalizedEmail = String(rawEmail).toLowerCase().trim();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(
      "Account record matching input email criteria not found",
      404,
    );
  }

  const tokenRecord = await verificationTokenRepository.findTokenByUserId(
    user._id,
  );
  if (!tokenRecord) {
    throw new AppError(
      "No active confirmation request found for this user account",
      400,
    );
  }

  if (tokenRecord.expiresAt < new Date()) {
    await verificationTokenRepository.deleteTokensByUserId(user._id);
    throw new AppError(
      "The provided verification OTP has expired. Please request a new token code",
      400,
    );
  }

  const isMatch = await bcrypt.compare(String(rawOtp).trim(), tokenRecord.otp);
  if (!isMatch) {
    throw new AppError(
      "Invalid verification code specified. Access denied",
      400,
    );
  }

  user.isEmailVerified = true;
  await userRepository.saveUser(user);
  await verificationTokenRepository.deleteTokensByUserId(user._id);
};

/**
 * Evaluates inbound cryptographic search tokens from link clicks to activate registrations.
 * @param {string} rawToken
 * @param {string} rawEmail
 * @throws {AppError} 400 | 404
 * @returns {Promise<Object>} Object containing the user's mapped platform role.
 */
const processLinkVerification = async (rawToken, rawEmail) => {
  if (!rawToken || !rawEmail) {
    throw new AppError(
      "Both validation token and matching email queries parameters are required fields",
      400,
    );
  }

  const normalizedEmail = String(rawEmail).toLowerCase().trim();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(
      "Account record matching input email criteria not found",
      404,
    );
  }

  const tokenRecord = await verificationTokenRepository.findTokenByUserId(
    user._id,
  );
  if (!tokenRecord) {
    throw new AppError(
      "No active validation entries tracked matching this configuration",
      400,
    );
  }

  if (tokenRecord.expiresAt < new Date()) {
    await verificationTokenRepository.deleteTokensByUserId(user._id);
    throw new AppError(
      "This verification magic link has expired. Please re-trigger a new setup profile link",
      400,
    );
  }

  const isMatch = await bcrypt.compare(
    String(rawToken).trim(),
    tokenRecord.token,
  );
  if (!isMatch) {
    throw new AppError(
      "Invalid or corrupted security token context block parameter",
      400,
    );
  }

  user.isEmailVerified = true;
  await userRepository.saveUser(user);
  await verificationTokenRepository.deleteTokensByUserId(user._id);

  // Return the user's role profile to ensure the network layer can drive dynamic application rerouting
  return { role: user.roles?.[0] || null };
};

module.exports = {
  initiateVerification,
  processOtpVerification,
  processLinkVerification,
};
