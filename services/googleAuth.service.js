/**
 * @fileoverview Google Authentication Service
 * @description Decouples identity federation, payload verification, and token signing logic
 * from transport wrappers via parameter dependency injection.
 */

const AppError = require("../utils/AppError");
const { toUserDTO } = require("../mappers/user.mapper");

const DEFAULT_ROLE = "mentee";
const PROVIDER_GOOGLE = "google";

const createGoogleAuthService = (
  userRepository,
  oauthAccountRepository,
  walletService,
  authUtils,
  jwt,
  config,
  logger,
) => {
  /**
   * Authenticates users leveraging federated Google ID Tokens.
   */
  const googleAuthUser = async ({ credential, roles, termsAccepted }) => {
    if (!credential) {
      throw new AppError("Missing Google credential", 400);
    }

    const envAudience = config.googleClientId?.trim();
    if (!envAudience) {
      throw new AppError(
        "GOOGLE_CLIENT_ID is undefined in system configuration environments",
        500,
      );
    }

    const decodedToken = jwt.decode(credential);
    let ticket;

    try {
      ticket = await authUtils.googleClient.verifyIdToken({
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
      const { valid, message, uniqueRoles } =
        authUtils.validateRoles(incomingRoles);
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

      await walletService.createWalletsForRoles(user._id, uniqueRoles);

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

    const accessToken = authUtils.signAccessToken(user._id);
    const refreshToken = authUtils.signRefreshToken(user._id);

    return {
      accessToken,
      refreshToken,
      user: toUserDTO(user),
      isNewUser,
    };
  };

  return { googleAuthUser };
};

module.exports = createGoogleAuthService;
