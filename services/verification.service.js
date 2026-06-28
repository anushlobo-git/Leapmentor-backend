/**
 * @fileoverview Verification Lifecycle Business Logic Service
 * @description Generates high-entropy tokens, computes cryptographic hashes,
 * and handles registration time windows via factory parameter injection.
 */

const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");

const BCRYPT_SALT_ROUNDS = 10;
const TOKEN_LIFETIME_MS = 10 * 60 * 1000; // 10 Minutes window

const createVerificationService = ({
  userRepository,
  verificationTokenRepository,
  sendWithRetry,
}) => {
  /**
   * Internal Helper: Generates a cryptographically secure 6-digit numeric verification OTP code.
   * @private
   */
  const _generateNumericOtp = () => {
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
  const _generateHexToken = () => crypto.randomBytes(32).toString("hex");

  /**
   * Generates validation signatures, secures entries in the database, and dispatches automated mail options.
   * @private
   */
  const _sendVerificationEmail = async (user, subjectSuffix = "") => {
    await verificationTokenRepository.deleteTokensByUserId(user._id);

    const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);
    const plainOtp = _generateNumericOtp();
    const plainToken = _generateHexToken();

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

    await sendWithRetry(
      {
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
      },
      "Email Verification",
    );
  };

  const initiateVerification = async (rawEmail, subjectSuffix = "") => {
    if (!rawEmail) {
      throw new AppError(
        "email is required to process token distributions",
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
    if (user.isEmailVerified) {
      throw new AppError(
        "Verification conflict: Target profile email is already verified",
        400,
      );
    }

    await _sendVerificationEmail(user, subjectSuffix);
  };

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

    const isMatch = await bcrypt.compare(
      String(rawOtp).trim(),
      tokenRecord.otp,
    );
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

    return { role: user.roles?.[0] || null };
  };

  return {
    initiateVerification,
    processOtpVerification,
    processLinkVerification,
  };
};

module.exports = createVerificationService;
