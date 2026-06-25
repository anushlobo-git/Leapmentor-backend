const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/user.repository");
const oAuthAccountRepository = require("../repositories/oAuthAccount.repository");
const {
  clerkClient,
  signToken,
  validateRoles,
} = require("../utils/auth.utils");
const {
  createWalletsForRoles,
  createWalletForRole,
} = require("./wallet.service");
const { toUserDTO } = require("../mappers/user.mapper");

const clerkSSOAuth = async ({ clerkToken, roles, termsAccepted }) => {
  if (!clerkToken) throw new Error("Missing Clerk token");

  const decoded = jwt.decode(clerkToken);
  if (!decoded?.sub) throw new Error("Invalid Clerk token");

  // ── Fetch user from Clerk ─────────────────────────────────
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(decoded.sub);
  } catch {
    throw new Error("Could not fetch Clerk user");
  }

  const email = clerkUser.emailAddresses?.[0]?.emailAddress
    ?.toLowerCase()
    .trim();
  const name =
    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User";
  const externalAccount = clerkUser.externalAccounts?.[0];
  const provider = externalAccount?.provider
    ?.replace("oauth_", "")
    .replace("_oidc", "");
  const providerId = externalAccount?.externalId;

  if (!email) throw new Error("No email returned from provider");

  // ── Find or create user ───────────────────────────────────
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
      isEmailVerified: true,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    await createWalletsForRoles(user._id, uniqueRoles);
    isNewUser = true;
  } else {
    if (Array.isArray(roles) && roles.length) {
      const mergedRoles = [...new Set([...user.roles, ...roles])];
      if (mergedRoles.length !== user.roles.length) {
        const addedRoles = roles.filter((r) => !user.roles.includes(r));
        user.roles = mergedRoles;
        await userRepository.saveUser(user);
        for (const role of addedRoles) {
          await createWalletForRole(user._id, role);
        }
      }
    }
  }

  // ── Link OAuth account ────────────────────────────────────
  if (provider && providerId) {
    const existingOAuth = await oAuthAccountRepository.findOAuthAccount(
      provider,
      providerId,
    );
    if (!existingOAuth) {
      await oAuthAccountRepository.createOAuthAccount({
        user: user._id,
        provider,
        providerId,
      });
    }
  }

  const token = signToken(user._id);
  return { token, user: toUserDTO(user), isNewUser };
};

module.exports = { clerkSSOAuth };
