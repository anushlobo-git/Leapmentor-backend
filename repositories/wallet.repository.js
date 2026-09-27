/**
 * @fileoverview Wallet Repository
 * @description Direct database access layer for processing asset balances, user escrows, and wallet models.
 * Receives the Mongoose model as an injected parameter. Contains no business constraints or transaction lifecycles.
 */

const createWalletRepository = (Wallet) => {
  /**
   * Collects a read-only list of all escrow accounts.
   * @returns {Promise<Array<Object>>}
   */
  const findAllWallets = () => Wallet.find().select("escrow").lean();

  /**
   * Finds a wallet entry bound to an explicit user account tracking identifier.
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  const findWalletByUserId = (userId) => Wallet.findOne({ user: userId });

  /**
   * Formally updates modifications committed to a mutable instance index.
   * @param {Object} wallet
   * @returns {Promise<Object>}
   */
  const saveWallet = (wallet) => wallet.save();

  /**
   * Fetch a lean, performance-optimized data layout of a specific user wallet map.
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  const findWalletByUser = (userId) => Wallet.findOne({ user: userId }).lean();

  /**
   * Locates an entity for mutable inline balance adjustment.
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  const findWalletByUserMutable = (userId) => Wallet.findOne({ user: userId });

  /**
   * Fetches an immutable balance verification record cross-matched by identifier and account roles.
   * @param {string} userId
   * @param {string} role
   * @returns {Promise<Object|null>}
   */
  const findWalletByUserAndRole = (userId, role) =>
    Wallet.findOne({ user: userId, role }).lean();

  /**
   * Locates a role-scoped wallet for mutable inline balance adjustment.
   * Non-lean so the caller can mutate + save it. Use this instead of the
   * unscoped findWalletByUserMutable whenever a user may hold both a mentee
   * and a mentor wallet — otherwise findOne({ user }) can return the wrong one.
   * @param {string} userId
   * @param {string} role
   * @returns {Promise<Object|null>}
   */
  const findWalletByUserAndRoleMutable = (userId, role) =>
    Wallet.findOne({ user: userId, role });

  /**
   * Generates an active tracking balance matrix row.
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  const createWallet = (data) => Wallet.create(data);

  /**
   * Finds a specific user's wallet using an active transaction session.
   * @param {string} userId
   * @param {ClientSession} [session]
   * @returns {Promise<Object|null>}
   */
  const findByUserId = (userId, session) => {
    return Wallet.findOne({ user: userId }).session(session);
  };

  /**
   * Finds a user's wallet filtered strictly by role constraints.
   * @param {string} userId
   * @param {string} role
   * @param {ClientSession} [session]
   * @returns {Promise<Object|null>}
   */
  const findByUserIdAndRole = (userId, role, session) => {
    return Wallet.findOne({ user: userId, role }).session(session);
  };

  /**
   * Increments a user's wallet balance using an upsert option.
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<Object>}
   */
  const incrementBalance = (userId, amount) => {
    return Wallet.findOneAndUpdate(
      { user: userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true },
    );
  };

  /**
   * Increments a role-scoped wallet's balance. No upsert: the target role
   * wallet is expected to already exist (both are seeded at registration), so
   * a missing match returns null rather than silently creating a stray,
   * role-less wallet the way an upsert on { user } would.
   * @param {string} userId
   * @param {string} role
   * @param {number} amount
   * @returns {Promise<Object|null>}
   */
  const incrementBalanceByRole = (userId, role, amount) => {
    return Wallet.findOneAndUpdate(
      { user: userId, role },
      { $inc: { balance: amount } },
      { new: true },
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

  return {
    findAllWallets,
    findWalletByUserId,
    saveWallet,
    findWalletByUser,
    findWalletByUserMutable,
    findWalletByUserAndRole,
    findWalletByUserAndRoleMutable,
    createWallet,
    findByUserId,
    findByUserIdAndRole,
    incrementBalance,
    incrementBalanceByRole,
    save,
  };
};

module.exports = createWalletRepository;
