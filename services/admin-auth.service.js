/**
 * @fileoverview Admin Authentication Service
 * @description Coordinates administrator credentials verification, account activity checks,
 * token signatures, and access log tracking. Receives injected repositories.
 */


const AppError = require("../utils/AppError");

const createAdminAuthService = ({adminUserRepository, jwt, toAdminDTO}) => {

  const signAdminToken = (id) =>
    jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
  /**
   * Validates administrator credentials and generates an access session.
   * @param {Object} payload
   * @param {string} payload.email
   * @param {string} payload.password
   * @returns {Promise<Object>} Formatted object holding session token and mapped administrator data.
   */
  const adminLoginService = async ({ email, password }) => {
    const admin = await adminUserRepository.findAdminByEmail(email);
    if (!admin) throw new AppError("Invalid credentials.", 401);
    if (!admin.isActive)
      throw new AppError("Admin account is deactivated.", 403);

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) throw new AppError("Invalid credentials.", 401);

    admin.lastLoginAt = new Date();
    await adminUserRepository.saveAdmin(admin);

    const token = signAdminToken(admin._id);
    return {
      token,
      admin: toAdminDTO(admin),
    };
  };

  return {
    adminLoginService,
  };
};

module.exports = createAdminAuthService;
