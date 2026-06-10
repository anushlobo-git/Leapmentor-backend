/**
 * @fileoverview User Model Repository
 * @description  Direct database access layer mapping all actions to the Mongoose User schema.
 * Contains no validation logic or business constraints.
 */

const User = require("../models/User");

/**
 * Fetch document identifiers using a regex search against name or email.
 * @param {string} search - Clean search text input.
 * @returns {Promise<Array<Object>>} Selected projection map containing matching document IDs.
 */
const findUsersBySearchTerm = (search) => {
  const regex = new RegExp(search.trim(), "i");
  return User.find({ $or: [{ name: regex }, { email: regex }] })
    .select("_id")
    .lean();
};

/**
 * Fetch matching profile indices using a regex constraint against name fields.
 * @param {string} name - Name string parameter.
 * @returns {Promise<Array<Object>>} Projected list layout containing unique object identifiers.
 */
const findUsersByName = (name) =>
  User.find({ name: { $regex: name.trim(), $options: "i" } })
    .select("_id")
    .lean();

/**
 * Count total number of all user entries across the model schema.
 * @returns {Promise<number>}
 */
const countAllUsers = () => User.countDocuments();

/**
 * Count matching entries using a custom filter query while ignoring soft deletions.
 * @param {Object} filter - Database matching expression rules.
 * @returns {Promise<number>}
 */
const countUsersWithOptions = (filter) =>
  User.countDocuments(filter).setOptions({ ignoreIsDeleted: true });

/**
 * Aggregates registration totals grouping records by day timeline metrics.
 * @param {Date} since - Historic boundary timeframe index.
 * @returns {Promise<Array<Object>>} Timeline dataset array.
 */
const getUserGrowth = (since) =>
  User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

/**
 * Count user entries matching a specific criteria filter configuration.
 * @param {Object} filter - Database criteria filter.
 * @returns {Promise<number>}
 */
const countUsersWithFilter = (filter) =>
  User.countDocuments(filter, { ignoreIsDeleted: true });

/**
 * Query a paginated sequence of lean user records matching a parameter filter block.
 * @param {Object} filter        - Identification match expression metrics.
 * @param {Object} boundaries    - Pagination properties map.
 * @param {number} boundaries.skip  - Numerical skip count offset.
 * @param {number} boundaries.limit - Total entries returned slice constraint.
 * @returns {Promise<Array<Object>>} Filtered list containing lean user objects.
 */
const findUsers = (filter, { skip, limit }) =>
  User.find(filter, null, { ignoreIsDeleted: true })
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

/**
 * Find an isolated user database snapshot file matching an ID.
 * @param {string} id - Main entity document lookup key.
 * @returns {Promise<Object|null>} Lean data dictionary structure representation.
 */
const findUserById = (id) =>
  User.findById(id)
    .select("-password")
    .setOptions({ ignoreIsDeleted: true })
    .lean();

/**
 * Find an active live Mongoose entity object matching an ID.
 * @param {string} id - Main entity document lookup key.
 * @returns {Promise<Object|null>} Mutable tracking document reference.
 */
const findUserByIdRaw = (id) => User.findById(id);

/**
 * Perform a hard-removal operation on an explicit document index.
 * @param {string} id - Main entity document lookup key.
 * @returns {Promise<Object|null>}
 */
const deleteUserById = (id) => User.findByIdAndDelete(id);

/**
 * Update access validation indices to apply an administrative soft-delete block.
 * @param {string} id - Main entity document lookup key.
 * @returns {Promise<Object|null>} Updated model state confirmation document.
 */
const blockUser = (id) =>
  User.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

/**
 * Clear operational constraint values to restore standard system permissions.
 * @param {string} id - Main entity document lookup key.
 * @returns {Promise<Object|null>} Updated model state confirmation document.
 */
const unblockUser = (id) =>
  User.findOneAndUpdate(
    { _id: id },
    { isDeleted: false, deletedAt: null },
    { new: true, ignoreIsDeleted: true },
  );

/**
 * Find a single user profile matching an explicit email address string.
 * @param {string} email - Search phrase mapping email.
 * @returns {Promise<Object|null>}
 */
const findUserByEmail = (email) => User.findOne({ email });

/**
 * Fetch a single user profile including its hidden password hash string.
 * @param {string} email - Search phrase mapping email.
 * @returns {Promise<Object|null>}
 */
const findUserByEmailWithPassword = (email) =>
  User.findOne({ email }).select("+password");

/**
 * Find a single profile index by ID including its hidden password hash string.
 * @param {string} userId - Main entity document lookup key.
 * @returns {Promise<Object|null>}
 */
const findUserByIdWithPassword = (userId) =>
  User.findById(userId).select("+password");

/**
 * Instantiate and persist a brand-new user record index within the schema.
 * @param {Object} data - Account configuration parameters payload.
 * @returns {Promise<Object>} Created model document validation details.
 */
const createUser = (data) => User.create(data);

/**
 * Persist updates made directly upon a tracked Mongoose document instance.
 * @param {Object} user - Tracked live schema document entity.
 * @returns {Promise<Object>}
 */
const saveUser = (user) => user.save();

/**
 * Fetch query matching identifiers evaluating case-insensitive name constraints.
 * @param {string} search - Search phrase query criteria parameter.
 * @returns {Promise<Array<Object>>} Lean projected collection containing unique IDs.
 */
const findUsersByNameSearch = (search) =>
  User.find({ name: { $regex: search, $options: "i" } })
    .select("_id")
    .lean();

module.exports = {
  findUsersBySearchTerm,
  findUsersByName,
  countAllUsers,
  countUsersWithOptions,
  getUserGrowth,
  countUsersWithFilter,
  findUsers,
  findUserById,
  findUserByIdRaw,
  deleteUserById,
  blockUser,
  unblockUser,
  findUserByEmail,
  findUserByEmailWithPassword,
  findUserByIdWithPassword,
  createUser,
  saveUser,
  findUsersByNameSearch,
};
