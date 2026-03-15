// controllers/auth/register.controller.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { signToken, sanitizeUser, validateRoles } = require("../utils/auth.utils");

const register = async (req, res) => {
  try {
    const { name, email, password, roles, termsAccepted } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: "roles must be an array with at least one role" });
    }
    if (termsAccepted !== true) {
      return res.status(400).json({ message: "You must accept terms to continue" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const { valid, message, uniqueRoles } = validateRoles(roles);
    if (!valid) return res.status(400).json({ message });

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      const newRoles = [...new Set([...existing.roles, ...uniqueRoles])];
      const rolesChanged = newRoles.length !== existing.roles.length;

      if (rolesChanged) {
        existing.roles = newRoles;
        await existing.save();
      }

      const token = signToken(existing._id);
      return res.status(200).json({
        message: rolesChanged ? "Role added successfully" : "Already registered with this role",
        token,
        user: sanitizeUser(existing),
        isNewUser: false,
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashed,
      roles: uniqueRoles,
      isEmailVerified: false,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    });

    // ✅ Create wallet — 500 points for mentee, 0 for mentor
    const isMentee        = uniqueRoles.includes("mentee");
    const startingBalance = isMentee ? 500 : 0;

    const wallet = await Wallet.create({
  user:    user._id,
  balance: startingBalance,
  escrow:  0,
});
console.log("Wallet created:", wallet);


    // ✅ Log welcome bonus transaction for mentees
    if (isMentee) {
     const tx= await Transaction.create({
        user:         user._id,
        type:         "credit",
        amount:       500,
        description:  "Welcome bonus — 500 points to get started",
        balanceAfter: 500,
      });
          console.log("Transaction created:", tx);

    }

    const token = signToken(user._id);
    return res.status(201).json({
      message: "Registered successfully",
      token,
      user: sanitizeUser(user),
      isNewUser: true,
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { register };