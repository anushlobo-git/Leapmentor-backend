/**
 * @fileoverview Wallet Management Service
 * @description  Business logic for provisioning role-based financial asset tracking accounts
 * and managing initial credit bonus disbursements.
 */

const walletRepository = require("../repositories/wallet.repository");
const transactionRepository = require("../repositories/transaction.repository");
const logger = require("../config/logger");

// Configuration Constants
const MENTEE_WELCOME_BONUS = 500;
const ROLE_MENTEE = "mentee";
const TRANSACTION_TYPE_CREDIT = "credit";
const DEFAULT_INITIAL_BALANCE = 0;
const DEFAULT_INITIAL_ESCROW = 0;

/**
 * Provision an individual role-specific wallet for a user and apply welcome bonuses.
 * @description Verifies if a duplicate role wallet already exists for the user. If the role matches
 * a mentee tier, it applies a welcome credit bonus and creates an entry record in the ledger.
 * @param {string} userId         - Unique database identifier key of the user.
 * @param {string} role           - Specific user role profile tier segment.
 * @returns {Promise<Object|null>} Created wallet document tracking details or null if already exists.
 */
const createWalletForRole = async (userId, role) => {
  const existing = await walletRepository.findWalletByUserAndRole(userId, role);
  if (existing) return null;

  const isMentee = role === ROLE_MENTEE;
  const startingBalance = isMentee
    ? MENTEE_WELCOME_BONUS
    : DEFAULT_INITIAL_BALANCE;

  logger.info("Wallet created", { userId, role, startingBalance });

  const wallet = await walletRepository.createWallet({
    user: userId,
    role,
    balance: startingBalance,
    escrow: DEFAULT_INITIAL_ESCROW,
  });

  if (isMentee) {
    await transactionRepository.createTransaction({
      user: userId,
      type: TRANSACTION_TYPE_CREDIT,
      amount: MENTEE_WELCOME_BONUS,
      description: `Welcome bonus — ${MENTEE_WELCOME_BONUS} points to get started`,
      balanceAfter: MENTEE_WELCOME_BONUS,
    });
  }

  return wallet;
};

/**
 * Provision multiple role-specific asset wallets sequentially from a role array list.
 * @param {string} userId        - Unique database identifier key of the user.
 * @param {Array<string>} roles  - Array selection matching assigned structural scopes.
 * @returns {Promise<void>}
 */
const createWalletsForRoles = async (userId, roles) => {
  for (const role of roles) {
    await createWalletForRole(userId, role);
  }
};

module.exports = { createWalletForRole, createWalletsForRoles };
