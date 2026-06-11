/**
 * @fileoverview Wallet Repository
 * @description  Direct database access layer for processing asset balances, user escrows, and wallet models.
 */

const Wallet = require("../models/Wallet");

/**
 * Collects a read-only list of all escrow accounts.
 * @returns {Promise<Array<Wallet>>}
 */
const findAllWallets = () => Wallet.find().select("escrow").lean();

/**
 * Finds a wallet entry bound to an explicit user account tracking identifier.
 * @param {string} userId
 * @returns {Promise<Wallet|null>}
 */
const findWalletByUserId = (userId) => Wallet.findOne({ user: userId });

/**
 * Formally updates modifications committed to a mutable instance index.
 * @param {Object} wallet
 * @returns {Promise<Wallet>}
 */
const saveWallet = (wallet) => wallet.save();

/**
 * Fetch a lean, performance-optimized data layout of a specific user wallet map.
 * @param {string} userId
 * @returns {Promise<Wallet|null>}
 */
const findWalletByUser = (userId) => Wallet.findOne({ user: userId }).lean();

/**
 * Locates an entity for mutable inline balance adjustment.
 * @param {string} userId
 * @returns {Promise<Wallet|null>}
 */
const findWalletByUserMutable = (userId) => Wallet.findOne({ user: userId });

/**
 * Fetches an immutable balance verification record cross-matched by identifier and account roles.
 * @param {string} userId
 * @param {string} role
 * @returns {Promise<Wallet|null>}
 */
const findWalletByUserAndRole = (userId, role) =>
  Wallet.findOne({ user: userId, role }).lean();

/**
 * Generates an active tracking balance matrix row.
 * @param {Object} data
 * @returns {Promise<Wallet>}
 */
const createWallet = (data) => Wallet.create(data);

/**
 * Finds a specific user's wallet using an active transaction session.
 * @param {string} userId
 * @param {ClientSession} [session]
 * @returns {Promise<Wallet|null>}
 */
const findByUserId = (userId, session) => {
  return Wallet.findOne({ user: userId }).session(session);
};

/**
 * Finds a user's wallet filtered strictly by role constraints.
 * @param {string} userId
 * @param {string} role
 * @param {ClientSession} [session]
 * @returns {Promise<Wallet|null>}
 */
const findByUserIdAndRole = (userId, role, session) => {
  return Wallet.findOne({ user: userId, role }).session(session);
};

/**
 * Increments a user's wallet balance using an upsert option.
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<Wallet>}
 */
const incrementBalance = (userId, amount) => {
  return Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: amount } },
    { new: true, upsert: true },
  );
};

/**
 * Saves a wallet document instance to the database inside a transaction session.
 * @param {Object} doc
 * @param {ClientSession} [session]
 * @returns {Promise<Object>}
 */
const save = (doc, session) => {
  return doc.save({ session });
};

module.exports = {
  findAllWallets,
  findWalletByUserId,
  saveWallet,
  findWalletByUser,
  findWalletByUserMutable,
  findWalletByUserAndRole,
  createWallet,
  findByUserId,
  findByUserIdAndRole,
  incrementBalance,
  save,
};
