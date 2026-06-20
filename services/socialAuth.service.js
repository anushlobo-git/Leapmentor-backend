/**
 * @fileoverview Social Authentication Service
 * @description Centralized business logic coordinating multi-provider third-party federated signups and profile account linking.
 */
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
  signAccessToken,
  signRefreshToken,
  validateRoles,
} = require("../utils/auth.utils");

// Upper-case Domain Constants
const ALLOWED_PROVIDERS = ["linkedin", "apple"];
const VALID_ROLE_VALUES = ["mentor", "mentee"];
const DEFAULT_FALLBACK_ROLE = "mentee";

/**
 * Resolves authentication parameters matching general incoming multi-provider social payloads.
 * @description Checks federation tables, logs existing single sign-on users instantly,
 * provisions user profiles alongside corresponding wallets for new signups,
 * and signs cross-domain access/refresh JSON web tokens.
 * @param {Object} params Execution parameters payload.
 * @param {string} params.provider Registered identifier representing the authenticating social provider.
 * @param {string} params.providerId Unique alphanumeric account identity key given by the network provider.
 * @param {string} params.email Primary contact email address mapped from the federated provider profile.
 * @param {string} params.name Extracted text label mapping user naming blocks.
 * @param {Array<string>} [params.roles] Intended target permissions roles specified down across signup tracks.
 * @param {boolean} [params.termsAccepted] Flag verifying absolute state of consent agreements.
 * @throws {AppError} 400 | 409
 * @returns {Promise<Object>} Formatted access keys alongside sanitized user layout dimensions blocks.
 */
const socialAuthUser = async ({
  provider,
  providerId,
  email,
  name,
  roles,
  termsAccepted,
}) => {
  logger.info("socialAuthUser engine execution initiated", { provider, email });

  if (!ALLOWED_PROVIDERS.includes(provider)) {
    throw new AppError("Invalid authentication provider configuration", 400);
  }
  if (!providerId) {
    throw new AppError(
      "providerId is required for social mapping validation",
      400,
    );
  }

  const existingOAuth = await oauthAccountRepository.findOAuthAccountWithUser(
    provider,
    providerId,
  );
  if (existingOAuth?.user) {
    const accessToken = signAccessToken(existingOAuth.user._id);
    const refreshToken = signRefreshToken(existingOAuth.user._id);

    logger.info("Existing OAuth profile authenticated successfully", {
      provider,
      userId: existingOAuth.user._id,
    });

    return {
      accessToken,
      refreshToken,
      user: toUserDTO(existingOAuth.user),
      isNewUser: false,
    };
  }

  if (!email) {
    throw new AppError("email is required to create or link an account", 400);
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  let user = await userRepository.findUserByEmail(normalizedEmail);
  let isNewUser = false;

  if (!user) {
    if (termsAccepted !== true) {
      throw new AppError("TERMS_NOT_ACCEPTED", 400);
    }

    const filteredRoles = Array.isArray(roles)
      ? roles.filter((r) => VALID_ROLE_VALUES.includes(r))
      : [];
    const incomingRoles = filteredRoles.length
      ? filteredRoles
      : [DEFAULT_FALLBACK_ROLE];

    const { valid, message, uniqueRoles } = validateRoles(incomingRoles);
    if (!valid) {
      throw new AppError(message, 400);
    }

    user = await userRepository.createUser({
      name: name ? String(name).trim() : "User",
      email: normalizedEmail,
      roles: uniqueRoles,
      isEmailVerified: true,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    await createWalletsForRoles(user._id, uniqueRoles);
    logger.info("New profile provisioned via federated social channel", {
      provider,
      userId: user._id,
      role: uniqueRoles[0],
    });
    isNewUser = true;
  }

  await oauthAccountRepository.createOAuthAccount({
    user: user._id,
    provider,
    providerId,
  });

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  return { accessToken, refreshToken, user: toUserDTO(user), isNewUser };
};

module.exports = { socialAuthUser };
