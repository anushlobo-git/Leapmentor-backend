/**
 * @fileoverview Admin User Repository
 * @description  Direct database access layer mapping all actions to the AdminUser Mongoose model.
 * Handles administrator discovery, account provisioning, credentials updates, and platform configurations.
 */

const AdminUser = require("../models/AdminUser");

/**
 * Retrieve an administrator profile matching an explicit email address.
 * @param {string} email - Unique target lookup email address.
 * @returns {Promise<Object|null>} The administrator document tracking map or null.
 */
const findAdminByEmail = (email) => AdminUser.findOne({ email });

/**
 * Persist lifecycle alterations or structural schema updates inside an active Mongoose document instance.
 * @param {Object} admin - The instantiated or modified Mongoose document instance.
 * @returns {Promise<Object>} The successfully saved tracking document context.
 */
const saveAdmin = (admin) => admin.save();

/**
 * Retrieve a complete, operational Mongoose document instance for a specific administrator ID.
 * @description Excludes lean optimization to preserve custom schema document prototype methods
 * (e.g., password comparison hooks).
 * @param {string} id - Unique database identifier key of the administrator.
 * @returns {Promise<Object|null>} Executable administrator document registry map or null.
 */
const findAdminById = (id) => AdminUser.findById(id);

/**
 * Fetch a optimized, read-only administrative snapshot containing only the platform commission rate.
 * @param {string} id - Unique database identifier key of the administrator.
 * @returns {Promise<Object|null>} Plain JavaScript object holding targeted commission data maps or null.
 */
const findAdminByIdLean = (id) =>
  AdminUser.findById(id).select("commissionRate").lean();

/**
 * Instantiate and persist a brand-new administrative security account document.
 * @param {Object} data               - Account initialization fields payload.
 * @param {string} data.name          - Full name string mapping the user entry.
 * @param {string} data.email         - Unique identifier registry email address.
 * @param {string} data.password      - Temporary target registration access password.
 * @param {boolean} [data.isSuperAdmin] - Operational authorization capability ranking flag.
 * @param {boolean} [data.isActive]   - Global tracking status modifier parameter.
 * @returns {Promise<Object>} The newly created administrator record document.
 */
const createAdmin = (data) => AdminUser.create(data);

/**
 * Modify discrete payload properties belonging to an administrator profile.
 * @param {string} id   - Unique database identifier key of the administrator.
 * @param {Object} data - Field parameters containing the updated settings payload.
 * @returns {Promise<Object|null>} Target data update tracking document context execution map.
 */
const updateAdminById = (id, data) =>
  AdminUser.findByIdAndUpdate(id, data, { new: true, runValidators: true });

/**
 * Finds the single active platform administrator.
 * @param {ClientSession} [session]
 * @returns {Promise<AdminUser|null>}
 */
const findActiveAdmin = (session) => {
  return AdminUser.findOne({ isActive: true })
    .select("commissionRate walletBalance")
    .session(session);
};

/**
 * Increments the wallet balance of a specific admin by ID.
 * @param {string} adminId
 * @param {number} amount
 * @returns {Promise<AdminUser|null>}
 */
const incrementWalletBalance = (adminId, amount) => {
  return AdminUser.findByIdAndUpdate(
    adminId,
    { $inc: { walletBalance: amount } },
    { new: true }
  );
};

/**
 * Finds the single active platform administrator.
 * @returns {Promise<AdminUser|null>}
 */
const findActiveAdminLean = () => {
  return AdminUser.findOne({ isActive: true })
    .select("commissionRate")
    .lean();
};

module.exports = {
  findAdminByEmail,
  saveAdmin,
  findAdminById,
  findAdminByIdLean,
  createAdmin,
  updateAdminById,
  findActiveAdmin,
  incrementWalletBalance,
  findActiveAdminLean,

};
