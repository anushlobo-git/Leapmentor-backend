/**
 * @fileoverview Admin Settings Configuration Service
 * @description Business logic managing administrative system profiles, updating
 * credentials, and configuring global commission fees. Receives injected repositories.
 */

const AppError = require("../utils/AppError");

const DEFAULT_COMMISSION_RATE = 20;
const RADIX_DECIMAL = 10;

const createAdminSettingsService = ({ adminUserRepository, userRepository, connectRequestRepository ,crypto }) => {
  /**
   * Fetch high-level ecosystem user registry tallies and active engagement counts.
   * @returns {Promise<Object>} Object containing aggregate user and active session counts.
   */
  const getOverviewService = async () => {
    const [totalUsers, activeSessions] = await Promise.all([
      userRepository.countAllUsers(),
      connectRequestRepository.countByStatus("ongoing"),
    ]);

    return { totalUsers, activeSessions };
  };

  /**
   * Modify and update an authenticated administrator's secure login credentials.
   */
  const changeAdminPasswordService = async (
    adminId,
    { oldPassword, newPassword },
  ) => {
    if (!oldPassword || !newPassword) {
      throw new AppError(
        "Both current and proposed passwords are required parameters.",
        400,
      );
    }
    // Execution maps straight onto the abstract data repository boundary layer
    await adminUserRepository.updateAdminById(adminId, {
      password: newPassword,
    });
  };

  /**
   * Register and provision a brand-new secondary system administrative entity.
   */
  const addAdminService = async ({ name, email }) => {
    if (!name?.trim() || !email?.trim()) {
      throw new AppError("Name and email are required fields.", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing =
      await adminUserRepository.findAdminByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(
        "An administrator account with this email already exists.",
        409,
      );
    }

    const tempPassword = crypto.randomBytes(6).toString("base64url") + "A1!";

    const newAdmin = await adminUserRepository.createAdmin({
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

  /**
   * Fetch the global platform transaction matching fee percentage assigned to an administrator.
   */
  const getCommissionService = async (adminId) => {
    const admin = await adminUserRepository.findAdminByIdLean(adminId);
    return admin?.commissionRate ?? DEFAULT_COMMISSION_RATE;
  };

  /**
   * Update the global matching fee rate applied to platform financial distributions.
   */
  const updateCommissionService = async (adminId, commissionRate) => {
    const rate = Number.parseFloat(commissionRate, RADIX_DECIMAL);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      throw new AppError(
        "Commission rate must be a valid percentage metrics number between 0 and 100.",
        400,
      );
    }

    await adminUserRepository.updateAdminById(adminId, {
      commissionRate: rate,
    });
    return rate;
  };

  return {
    getOverviewService,
    changeAdminPasswordService,
    addAdminService,
    getCommissionService,
    updateCommissionService,
  };
};

module.exports = createAdminSettingsService;
