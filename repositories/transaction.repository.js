/**
 * @fileoverview Transaction Repository
 * @description Direct database access layer mapping all operations to the Transaction Mongoose model.
 * Receives the Mongoose model as an injected parameter. Contains no validation logic or accounting constraints.
 */

const createTransactionRepository = (Transaction) => {
  /**
   * Count total transaction entries satisfying explicit parameter filter conditions.
   * @param {Object} filter - Database matching expression criteria.
   * @returns {Promise<number>} The total count of matching transaction documents.
   */
  const countTransactions = (filter) => Transaction.countDocuments(filter);

  /**
   * Query a paginated sequence of detailed transaction records matching a parameter filter block.
   * @param {Object} filter        - Identification match expression metrics.
   * @param {Object} options       - Pagination properties map.
   * @param {number} options.skip  - Numerical skip count offset indicator.
   * @param {number} options.limit - Quantitative item block restriction configuration parameter.
   * @returns {Promise<Array<Object>>} Filtered dataset collection list mapping lean populated transactions.
   */
  const findTransactions = (filter, { skip, limit }) =>
    Transaction.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

  /**
   * Instantiate and persist a brand-new transaction record ledger within the database schema.
   * @param {Object} data - Transaction ledger data creation payload mapping.
   * @returns {Promise<Object>} The newly created transaction document details.
   */
  const createTransaction = (data) => Transaction.create(data);

  /**
   * Batches and writes new transactions into the database logs inside a session.
   * @param {Array<Object>} transactionData
   * @param {ClientSession} [session]
   * @returns {Promise<Array<Object>>}
   */
  const createMany = (transactionData, session) => {
    return Transaction.create(transactionData, { session });
  };

  return {
    countTransactions,
    findTransactions,
    createTransaction,
    createMany,
  };
};

module.exports = createTransactionRepository;
