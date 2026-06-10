// services/socialAuth.service.js
const userRepository = require("../repositories/user.repository");
const oauthAccountRepository = require("../repositories/oauthAccount.repository");
const {
  signToken,
  sanitizeUser,
  signAccessToken,
  signRefreshToken,
  validateRoles,
} = require("../utils/auth.utils");
const { createWalletsForRoles } = require("./wallet.service");
const logger = require("../config/logger");


const ALLOWED_PROVIDERS = ["linkedin", "apple"];

const socialAuthUser = async ({
  provider,
  providerId,
  email,
  name,
  roles,
  termsAccepted,
}) => {

  logger.info("socialAuthUser called", { provider, email });

  if (!ALLOWED_PROVIDERS.includes(provider))
    throw new Error("Invalid provider");
  if (!providerId) throw new Error("providerId is required");

  // check if oauth account already exists
  const existingOAuth = await oauthAccountRepository.findOAuthAccountWithUser(provider, providerId);
  if (existingOAuth?.user) {
    const  accessToken=signAccessToken(existingOAuth.user._id);
    const refreshToken=signRefreshToken(existingOAuth.user._id);
    logger.info("Existing OAuth user logged in", {
      provider,
      userId: existingOAuth.user._id,
    });
    return { accessToken , refreshToken, user: sanitizeUser(existingOAuth.user), isNewUser: false };
  }

  if (!email) throw new Error("email is required to create/link account");

  const normalizedEmail = String(email).toLowerCase().trim();
  let user = await userRepository.findUserByEmail(normalizedEmail);
  let isNewUser = false;

  if (!user) {
    if (termsAccepted !== true) throw new Error("TERMS_NOT_ACCEPTED");

    const validRoleValues = ["mentor", "mentee"];
    const filteredRoles = Array.isArray(roles)
      ? roles.filter((r) => validRoleValues.includes(r))
      : [];
    const incomingRoles = filteredRoles.length ? filteredRoles : ["mentee"];
    const { valid, message, uniqueRoles } = validateRoles(incomingRoles);
    if (!valid) throw new Error(message);

    user = await userRepository.createUser({
      name: name ? String(name).trim() : "User",
      email: normalizedEmail,
      roles: uniqueRoles,
      isEmailVerified: true,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    await createWalletsForRoles(user._id, uniqueRoles);
    logger.info("New user created via social auth", { provider, userId: user._id, role: uniqueRoles[0] });
    isNewUser = true;
  }

  await oauthAccountRepository.createOAuthAccount({ user: user._id, provider, providerId });

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  return { accessToken, refreshToken, user: sanitizeUser(user), isNewUser };
};

module.exports = { socialAuthUser };
