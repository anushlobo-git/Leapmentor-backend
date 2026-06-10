/**
 * @fileoverview Wallet Repository
 * @description  Direct database access layer for processing asset balances and user escrows.
 * No business logic — query execution only.
 */

const Wallet = require("../models/Wallet");

/**
 * Collects a read-only list of all escrow accounts.
 * @returns {Promise<Array<Wallet>>} Array containing active entity indices
 */
const findAllWallets = () => Wallet.find().select("escrow").lean();

/**
 * Finds a wallet entry bound to an explicit user account tracking identifier.
 * @param {string} userId - Reference owner context identity
 * @returns {Promise<Wallet|null>} Managed entity document
 */
const findWalletByUserId = (userId) => Wallet.findOne({ user: userId });

/**
 * Formally updates modifications committed to a mutable instance index.
 * @param {Object} wallet - Mutable ledger document context
 * @returns {Promise<Wallet>} Updated collection execution model
 */
const saveWallet = (wallet) => wallet.save();

/**
 * Fetch a lean performance-optimized data layout of a specific user wallet map.
 * @param {string} userId - Unique owner context token
 * @returns {Promise<Wallet|null>} Immutable representation document
 */
const findWalletByUser = (userId) => Wallet.findOne({ user: userId }).lean();

/**
 * Locates an entity for mutable inline balance adjustment.
 * @param {string} userId - Root context identifier key
 * @returns {Promise<Wallet|null>} Live model link instance
 */
const findWalletByUserMutable = (userId) => Wallet.findOne({ user: userId });

/**
 * Fetches an immutable balance verification record cross-matched by identifier and account roles.
 * @param {string} userId - Key relational token
 * @param {string} role - Bound permission category value
 * @returns {Promise<Wallet|null>} Static payload result
 */
const findWalletByUserAndRole = (userId, role) =>
  Wallet.findOne({ user: userId, role }).lean();

/**
 * Generates an active tracking balance matrix row.
 * @param {Object} data - Setup properties parameters template
 * @returns {Promise<Wallet>} New transactional database schema context
 */
const createWallet = (data) => Wallet.create(data);

module.exports = {
  findAllWallets,
  findWalletByUserId,
  saveWallet,
  findWalletByUser,
  findWalletByUserMutable,
  findWalletByUserAndRole,
  createWallet,
};
