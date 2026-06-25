/**
 * @fileoverview Wallet Management Service
 * @description Business logic for provisioning role-based financial asset tracking accounts
 * and managing initial credit bonus disbursements via parameter dependency injection.
 */

const { toWalletDTO } = require("../mappers/wallet.mapper");

// Configuration Constants
const MENTEE_WELCOME_BONUS = 500;
const ROLE_MENTEE = "mentee";
const TRANSACTION_TYPE_CREDIT = "credit";
const DEFAULT_INITIAL_BALANCE = 0;
const DEFAULT_INITIAL_ESCROW = 0;

const createWalletService = (
  walletRepository,
  transactionRepository,
  logger,
) => {
  /**
   * Provision an individual role-specific wallet for a user and apply welcome bonuses.
   */
  const createWalletForRole = async (userId, role) => {
    const existing = await walletRepository.findWalletByUserAndRole(
      userId,
      role,
    );
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

    return toWalletDTO(wallet);
  };

  /**
   * Provision multiple role-specific asset wallets sequentially from a role array list.
   */
  const createWalletsForRoles = async (userId, roles) => {
    for (const role of roles) {
      await createWalletForRole(userId, role);
    }
  };

  return {
    createWalletForRole,
    createWalletsForRoles,
  };
};

module.exports = createWalletService;
