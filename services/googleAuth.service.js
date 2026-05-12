// services/googleAuth.service.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OAuthAccount = require("../models/OAuthAccount");
const {
  googleClient,
  signToken,
  sanitizeUser,
  validateRoles,
} = require("../utils/auth.utils");
const {
  createWalletsForRoles,
  createWalletForRole,
} = require("./wallet.service");

const googleAuthUser = async ({ credential, roles, termsAccepted }) => {
  if (!credential) throw new Error("Missing Google credential");

  const decodedToken = jwt.decode(credential);
  const envAudience = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!envAudience) throw new Error("GOOGLE_CLIENT_ID is undefined in .env");

  // verify token with google
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

  let user = await User.findOne({ email });
  let isNewUser = false;

  if (!user) {
    // new user — terms and roles required
    if (termsAccepted !== true) throw new Error("TERMS_NOT_ACCEPTED");

    const incomingRoles =
      Array.isArray(roles) && roles.length ? roles : ["mentee"];
    const { valid, message, uniqueRoles } = validateRoles(incomingRoles);
    if (!valid) throw new Error(message);

    user = await User.create({
      name,
      email,
      roles: uniqueRoles,
      isEmailVerified: !!emailVerified,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    await createWalletsForRoles(user._id, uniqueRoles);
    isNewUser = true;
  } else {
    // existing user — merge roles if new ones sent
    if (Array.isArray(roles) && roles.length) {
      const mergedRoles = [...new Set([...user.roles, ...roles])];
      if (mergedRoles.length !== user.roles.length) {
        const addedRoles = roles.filter((r) => !user.roles.includes(r));
        user.roles = mergedRoles;
        await user.save();
        for (const role of addedRoles) {
          await createWalletForRole(user._id, role);
        }
      }
    }
  }

  // link OAuth account if not already linked
  const existingOAuth = await OAuthAccount.findOne({
    provider: "google",
    providerId: googleSub,
  });
  if (!existingOAuth) {
    await OAuthAccount.create({
      user: user._id,
      provider: "google",
      providerId: googleSub,
    });
  }

  const token = signToken(user._id);
  return { token, user: sanitizeUser(user), isNewUser };
};

module.exports = { googleAuthUser };
