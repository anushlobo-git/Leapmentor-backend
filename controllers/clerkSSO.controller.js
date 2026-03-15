// controllers/auth/clerkSSO.controller.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OAuthAccount = require("../models/OAuthAccount");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { clerkClient, signToken, sanitizeUser, validateRoles } = require("../utils/auth.utils");

const clerkSSO = async (req, res) => {
  try {
    const { clerkToken, roles, termsAccepted } = req.body;

    if (!clerkToken) {
      return res.status(400).json({ message: "Missing Clerk token" });
    }

    // 1) Decode token to get Clerk user ID (sub)
    const decoded = jwt.decode(clerkToken);
    console.log("🔑 Decoded Clerk token sub:", decoded?.sub);

    if (!decoded?.sub) {
      return res.status(401).json({ message: "Invalid Clerk token" });
    }

    // 2) Fetch full user from Clerk using the user ID
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(decoded.sub);
    } catch (err) {
      console.error("❌ Failed to fetch Clerk user:", err.message);
      return res.status(401).json({ message: "Could not fetch Clerk user", error: err.message });
    }

    console.log("✅ Clerk user fetched:", clerkUser.id);

    const email = clerkUser.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();
    const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User";
    const externalAccount = clerkUser.externalAccounts?.[0];
    const provider = externalAccount?.provider?.replace("oauth_", "").replace("_oidc", "");
    const providerId = externalAccount?.externalId;

    console.log("📧 Email:", email, "| Provider:", provider, "| Name:", name);

    if (!email) {
      return res.status(400).json({ message: "No email returned from provider" });
    }

    // 3) Find or create user in your DB
    let user = await User.findOne({ email });
    let isNewUser = false;

    console.log("🔍 User found in DB:", !!user, "| Email:", email);

    if (!user) {
      if (termsAccepted !== true) {
        return res.status(400).json({ message: "You must accept terms to continue" });
      }

      const incomingRoles = Array.isArray(roles) && roles.length ? roles : ["mentee"];
      const { valid, message, uniqueRoles } = validateRoles(incomingRoles);
      if (!valid) return res.status(400).json({ message });

      console.log("🆕 Creating new user with roles:", uniqueRoles);

      user = await User.create({
        name,
        email,
        roles: uniqueRoles,
        isEmailVerified: true,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      });

      console.log("✅ User created:", user._id, "| Roles:", user.roles);

      // ✅ Create wallet — 500 points for mentee, 0 for mentor
      const isMentee        = uniqueRoles.includes("mentee");
      const startingBalance = isMentee ? 500 : 0;

      console.log("💰 Creating wallet | isMentee:", isMentee, "| startingBalance:", startingBalance);

      try {
        const wallet = await Wallet.create({
          user:    user._id,
          balance: startingBalance,
          escrow:  0,
        });
        console.log("✅ Wallet created:", wallet._id, "| Balance:", wallet.balance);

        if (isMentee) {
          const tx = await Transaction.create({
            user:         user._id,
            type:         "credit",
            amount:       500,
            description:  "Welcome bonus — 500 points to get started",
            balanceAfter: 500,
          });
          console.log("✅ Transaction created:", tx._id);
        }
      } catch (walletErr) {
        console.error("❌ Wallet/Transaction creation failed:", walletErr.message);
      }

      isNewUser = true;

    } else {
      console.log("⚠️ Existing user found — skipping wallet creation | Roles:", user.roles);

      if (Array.isArray(roles) && roles.length) {
        const mergedRoles = [...new Set([...user.roles, ...roles])];
        if (mergedRoles.length !== user.roles.length) {
          user.roles = mergedRoles;
          await user.save();
          console.log("🔄 Roles updated:", user.roles);
        }
      }
    }

    // 4) Link OAuthAccount if not already linked
    if (provider && providerId) {
      const existingOAuth = await OAuthAccount.findOne({ provider, providerId });
      if (!existingOAuth) {
        await OAuthAccount.create({ user: user._id, provider, providerId });
        console.log("🔗 OAuthAccount linked | Provider:", provider);
      } else {
        console.log("ℹ️ OAuthAccount already linked | Provider:", provider);
      }
    }

    // 5) Issue YOUR JWT
    const token = signToken(user._id);
    console.log("🎟️ JWT issued for user:", user._id);

    return res.json({
      message: "SSO login successful",
      token,
      user: sanitizeUser(user),
      isNewUser,
    });

  } catch (err) {
    console.error("❌ Clerk SSO error:", err);
    return res.status(401).json({
      message: "Clerk SSO authentication failed",
      error: err.message,
    });
  }
};

module.exports = { clerkSSO };