// services/socialAuth.service.js
const User = require("../models/User");
const OAuthAccount = require("../models/OAuthAccount");
const {
  signToken,
  sanitizeUser,
  validateRoles,
} = require("../utils/auth.utils");
const { createWalletsForRoles } = require("./wallet.service");

const ALLOWED_PROVIDERS = ["linkedin", "apple"];

const socialAuthUser = async ({
  provider,
  providerId,
  email,
  name,
  roles,
  termsAccepted,
}) => {
  if (!ALLOWED_PROVIDERS.includes(provider))
    throw new Error("Invalid provider");
  if (!providerId) throw new Error("providerId is required");

  // check if oauth account already exists
  const existingOAuth = await OAuthAccount.findOne({
    provider,
    providerId,
  }).populate("user");
  if (existingOAuth?.user) {
    const token = signToken(existingOAuth.user._id);
    return { token, user: sanitizeUser(existingOAuth.user), isNewUser: false };
  }

  if (!email) throw new Error("email is required to create/link account");

  const normalizedEmail = String(email).toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });
  let isNewUser = false;

  if (!user) {
    if (termsAccepted !== true) throw new Error("TERMS_NOT_ACCEPTED");

    const incomingRoles =
      Array.isArray(roles) && roles.length ? roles : ["mentee"];
    const { valid, message, uniqueRoles } = validateRoles(incomingRoles);
    if (!valid) throw new Error(message);

    user = await User.create({
      name: name ? String(name).trim() : "User",
      email: normalizedEmail,
      roles: uniqueRoles,
      isEmailVerified: true,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    await createWalletsForRoles(user._id, uniqueRoles);
    isNewUser = true;
  }

  await OAuthAccount.create({ user: user._id, provider, providerId });

  const token = signToken(user._id);
  return { token, user: sanitizeUser(user), isNewUser };
};

module.exports = { socialAuthUser };
