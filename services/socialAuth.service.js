/**
 * @fileoverview Social Authentication Service
 * @description Centralized business logic coordinating multi-provider third-party
 * federated signups and profile account linking via dependency injection parameters.
 */

const AppError = require("../utils/AppError");
const { toUserDTO } = require("../mappers/user.mapper");

// Upper-case Domain Constants
const ALLOWED_PROVIDERS = new Set(["linkedin", "apple"]);
const VALID_ROLE_VALUES = new Set(["mentor", "mentee"]);
const DEFAULT_FALLBACK_ROLE = "mentee";

const createSocialAuthService = ({
  userRepository,
  oauthAccountRepository,
  walletService,
  authUtils,
  logger,
}) => {
  /**
   * Resolves authentication parameters matching general incoming multi-provider social payloads.
   */
  const socialAuthUser = async ({
    provider,
    providerId,
    email,
    name,
    roles,
    termsAccepted,
  }) => {
    logger.info("socialAuthUser engine execution initiated", {
      provider,
      email,
    });

    if (!ALLOWED_PROVIDERS.has(provider)) {
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
      const accessToken = authUtils.signAccessToken(existingOAuth.user._id);
      const refreshToken = authUtils.signRefreshToken(existingOAuth.user._id);

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
        ? roles.filter((r) => VALID_ROLE_VALUES.has(r))
        : [];
      const incomingRoles = filteredRoles.length
        ? filteredRoles
        : [DEFAULT_FALLBACK_ROLE];

      const { valid, message, uniqueRoles } =
        authUtils.validateRoles(incomingRoles);
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

      await walletService.createWalletsForRoles(user._id, uniqueRoles);
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

    const accessToken = authUtils.signAccessToken(user._id);
    const refreshToken = authUtils.signRefreshToken(user._id);

    return { accessToken, refreshToken, user: toUserDTO(user), isNewUser };
  };

  return { socialAuthUser };
};

module.exports = createSocialAuthService;
