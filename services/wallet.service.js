// services/wallet.service.js
const walletRepository = require("../repositories/wallet.repository");
const transactionRepository = require("../repositories/transaction.repository");

const MENTEE_WELCOME_BONUS = 500;

const createWalletForRole = async (userId, role) => {
  const existing = await walletRepository.findWalletByUserAndRole(userId, role);
  if (existing) return null;

  const isMentee = role === "mentee";
  const startingBalance = isMentee ? MENTEE_WELCOME_BONUS : 0;

  const wallet = await walletRepository.createWallet({
    user: userId,
    role,
    balance: startingBalance,
    escrow: 0,
  });

  if (isMentee) {
    await transactionRepository.createTransaction({
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
