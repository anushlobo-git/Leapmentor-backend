// services/wallet.service.js
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const MENTEE_WELCOME_BONUS = 500;

const createWalletForRole = async (userId, role) => {
  const existing = await Wallet.findOne({ user: userId, role });
  if (existing) return null;

  const isMentee = role === "mentee";
  const startingBalance = isMentee ? MENTEE_WELCOME_BONUS : 0;

  const wallet = await Wallet.create({
    user: userId,
    role,
    balance: startingBalance,
    escrow: 0,
  });

  if (isMentee) {
    await Transaction.create({
      user: userId,
      type: "credit",
      amount: MENTEE_WELCOME_BONUS,
      description: "Welcome bonus — 500 points to get started",
      balanceAfter: MENTEE_WELCOME_BONUS,
    });
  }

  return wallet;
};

const createWalletsForRoles = async (userId, roles) => {
  for (const role of roles) {
    await createWalletForRole(userId, role);
  }
};

module.exports = { createWalletForRole, createWalletsForRoles };
