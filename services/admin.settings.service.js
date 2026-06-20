/**
 * @fileoverview Admin Settings Configuration Service
 * @description  Business logic for managing administrative system profiles, updating
 * executive security credentials, provisioning secondary administrators, and configuring global commission fees.
 */

const AppError = require("../utils/AppError");
const {
  findAdminByIdLean,
  findAdminByEmail,
  saveAdmin,
  createAdmin,
  updateAdminById,
} = require("../repositories/admin.repository");
const { countAllUsers } = require("../repositories/user.repository");
const { countByStatus } = require("../repositories/connectRequest.repository");

// Configuration Constants
const DEFAULT_COMMISSION_RATE = 20;
const MIN_PASSWORD_LENGTH = 6;
const RADIX_DECIMAL = 10;

// ── SYSTEM CONFIGURATION SERVICES ───────────────────────────

/**
 * Fetch high-level ecosystem user registry tallies and active engagement counts.
 * @returns {Promise<Object>} Object containing aggregate user and active session counts.
 */
const getOverviewService = async () => {
  const [totalUsers, activeSessions] = await Promise.all([
    countAllUsers(),
    countByStatus("ongoing"),
  ]);

  return { totalUsers, activeSessions };
};

/**
 * Register and provision a brand-new secondary system administrative entity.
 * @param {Object} payload       - Account initialization fields payload.
 * @param {string} payload.name  - Structural name of the new administrator.
 * @param {string} payload.email - Target communication and login identity email string.
 * @throws {AppError} 400        - For missing identity properties.
 * @throws {AppError} 409        - If the target email matches an active administrative registry entry.
 * @returns {Promise<Object>}    Object holding the generated temporary access password and saved user mappings.
 */
const addAdminService = async ({ name, email }) => {
  if (!name?.trim() || !email?.trim()) {
    throw new AppError("Name and email are required fields.", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await findAdminByEmail(normalizedEmail);
  if (existing) {
    throw new AppError(
      "An administrator account with this email already exists.",
      409,
    );
  }

  // Generate a random 8-character base-36 alphanumeric string suffixed with explicit security tokens
  const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

  const newAdmin = await createAdmin({
    name: name.trim(),
    email: normalizedEmail,
    password: tempPassword,
    isSuperAdmin: false,
    isActive: true,
  });

  return {
    tempPassword,
    admin: {
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
    },
  };
};

// ── FINANCIAL COMMISSION SERVICES ───────────────────────────

/**
 * Fetch the global platform transaction matching fee percentage assigned to an administrator.
 * @param {string} adminId   - Unique identifier database key of the administrator.
 * @returns {Promise<number>} Mapped operational commission matching fee value or default metric fallback.
 */
const getCommissionService = async (adminId) => {
  const admin = await findAdminByIdLean(adminId);
  return admin?.commissionRate ?? DEFAULT_COMMISSION_RATE;
};

/**
 * Update the global matching fee rate applied to platform financial distributions.
 * @param {string} adminId        - Unique identifier database key of the administrator.
 * @param {number|string} commissionRate - Newly proposed percentage configuration fee.
 * @throws {AppError} 400         - If the input argument falls outside boundaries.
 * @returns {Promise<number>}     The successfully applied structural commission floating rate percentage.
 */
const updateCommissionService = async (adminId, commissionRate) => {
  const rate = parseFloat(commissionRate, RADIX_DECIMAL);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    throw new AppError(
      "Commission rate must be a valid percentage metrics number between 0 and 100.",
      400,
    );
  }

  await updateAdminById(adminId, { commissionRate: rate });
  return rate;
};

module.exports = {
  getOverviewService,
  //changeAdminPasswordService,
  addAdminService,
  getCommissionService,
  updateCommissionService,
};
