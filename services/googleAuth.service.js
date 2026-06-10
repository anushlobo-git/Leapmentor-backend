const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");
const oauthAccountRepository = require("../repositories/oauthAccount.repository");
const {
  googleClient,
  signAccessToken,
  signRefreshToken,
  sanitizeUser,
  validateRoles,
} = require("../utils/auth.utils");
const { createWalletsForRoles } = require("./wallet.service");
const logger = require("../config/logger");

const googleAuthUser = async ({ credential, roles, termsAccepted }) => {
  if (!credential) throw new Error("Missing Google credential");

  const decodedToken = jwt.decode(credential);
  const envAudience = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!envAudience) throw new Error("GOOGLE_CLIENT_ID is undefined in .env");

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: [envAudience, decodedToken?.aud],
  });

  const payload = ticket.getPayload();
  const email = payload?.email?.toLowerCase()?.trim();
  const name = payload?.name || "User";
  const googleSub = payload?.sub;
  const emailVerified = payload?.email_verified;

  if (!email || !googleSub) throw new Error("Invalid Google payload");

  let user = await userRepository.findUserByEmail(email);
  let isNewUser = false;

  if (!user) {
    if (termsAccepted !== true) throw new Error("TERMS_NOT_ACCEPTED");

    const incomingRoles =
      Array.isArray(roles) && roles.length ? roles : ["mentee"];
    const { valid, message, uniqueRoles } = validateRoles(incomingRoles);
    if (!valid) throw new Error(message);

    user = await userRepository.createUser({
      name,
      email,
      roles: uniqueRoles,
      isEmailVerified: !!emailVerified,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    await createWalletsForRoles(user._id, uniqueRoles);
    logger.info("New user registered via Google", {
      userId: user._id,
      role: uniqueRoles[0],
    });
    isNewUser = true;
  } else {
    logger.info("Existing user logged in via Google", { userId: user._id });
  }

  const existingOAuth = await oauthAccountRepository.findOAuthAccount(
    "google",
    googleSub,
  );
  if (!existingOAuth) {
    await oauthAccountRepository.createOAuthAccount({
      user: user._id,
      provider: "google",
      providerId: googleSub,
    });
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  return { accessToken, refreshToken, user: sanitizeUser(user), isNewUser };
};

module.exports = { googleAuthUser };
