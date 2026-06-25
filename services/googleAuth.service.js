/**
 * @fileoverview Google Authentication Service
 * @description Decouples identity federation, payload verification, and token signing logic from transport wrappers.
 */
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const logger = require("../config/logger");

// Repositories
const userRepository = require("../repositories/user.repository");
const oauthAccountRepository = require("../repositories/oAuthAccount.repository");

// Inter-domain Dependency
const { createWalletsForRoles } = require("./wallet.service");
const { toUserDTO } = require("../mappers/user.mapper");

// Utilities
const {
  googleClient,
  signAccessToken,
  signRefreshToken,
  validateRoles,
} = require("../utils/auth.utils");

// Upper-case Domain Constants
const DEFAULT_ROLE = "mentee";
const PROVIDER_GOOGLE = "google";

/**
 * Authenticates users leveraging federated Google ID Tokens.
 * @description Decodes credentials, validates cryptographic signatures via Google APIs,
 * provisions user documents alongside role-specific wallets for first-time signups,
 * binds third-party OAuth links, and mints access/refresh token structures.
 * @param {Object} payload Execution payload.
 * @param {string} payload.credential Raw encoded JWT token signature passed from Google client SDK.
 * @param {Array<string>} [payload.roles] Intended user access profiles claimed during onboarding registration.
 * @param {boolean} [payload.termsAccepted] Flag verifying explicit legal agreement states.
 * @throws {AppError} 400 | 401 | 500
 * @returns {Promise<Object>} Signed JWT tokens alongside sanitized user profile data blocks.
 */
const googleAuthUser = async ({ credential, roles, termsAccepted }) => {
  if (!credential) {
    throw new AppError("Missing Google credential", 400);
  }

  const envAudience = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!envAudience) {
    throw new AppError(
      "GOOGLE_CLIENT_ID is undefined in system configuration environments",
      500,
    );
  }

  const decodedToken = jwt.decode(credential);
  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: [envAudience, decodedToken?.aud],
    });
  } catch (verificationError) {
    throw new AppError(
      `Google identity verification failed: ${verificationError.message}`,
      401,
    );
  }

  const payload = ticket.getPayload();
  const email = payload?.email?.toLowerCase()?.trim();
  const name = payload?.name || "User";
  const googleSub = payload?.sub;
  const emailVerified = payload?.email_verified;

  if (!email || !googleSub) {
    throw new AppError("Invalid Google payload mapping values", 400);
  }

  let user = await userRepository.findUserByEmail(email);
  let isNewUser = false;

  if (!user) {
    if (termsAccepted !== true) {
      throw new AppError("TERMS_NOT_ACCEPTED", 400);
    }

    const incomingRoles =
      Array.isArray(roles) && roles.length ? roles : [DEFAULT_ROLE];
    const { valid, message, uniqueRoles } = validateRoles(incomingRoles);
    if (!valid) {
      throw new AppError(message, 400);
    }

    user = await userRepository.createUser({
      name,
      email,
      roles: uniqueRoles,
      isEmailVerified: !!emailVerified,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    await createWalletsForRoles(user._id, uniqueRoles);

    logger.info("New user registered via Google OAuth", {
      userId: user._id,
      role: uniqueRoles[0],
    });
    isNewUser = true;
  } else {
    logger.info("Existing user authenticated via Google OAuth", {
      userId: user._id,
    });
  }

  const existingOAuth = await oauthAccountRepository.findOAuthAccount(
    PROVIDER_GOOGLE,
    googleSub,
  );
  if (!existingOAuth) {
    await oauthAccountRepository.createOAuthAccount({
      user: user._id,
      provider: PROVIDER_GOOGLE,
      providerId: googleSub,
    });
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  return {
    accessToken,
    refreshToken,
    user: toUserDTO(user),
    isNewUser,
  };
};

module.exports = { googleAuthUser };
