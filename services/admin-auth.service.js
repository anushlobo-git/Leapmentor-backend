/**
 * @fileoverview Admin Authentication Service
 * @description Coordinates administrator credentials verification, account activity checks,
 * access/refresh token signatures, and session revocation. Receives injected repositories.
 */

const AppError = require("../utils/AppError");
const env = require("../config/env");

// Short-lived: what adminAuthenticate checks on every request.
const ACCESS_TOKEN_EXPIRES_IN = "15m";
// Long-lived: only ever sent to /admin/auth/login|refresh|logout.
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const createAdminAuthService = ({ adminUserRepository, jwt, toAdminDTO }) => {
  const signAccessToken = (id, tokenVersion) =>
    jwt.sign(
      { id, role: "admin", type: "access", tokenVersion },
      env.jwtAccessSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

  const signRefreshToken = (id, tokenVersion) =>
    jwt.sign(
      { id, role: "admin", type: "refresh", tokenVersion },
      env.jwtRefreshSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
    );

  /**
   * Validates administrator credentials and issues an access + refresh token pair.
   * @param {Object} payload
   * @param {string} payload.email
   * @param {string} payload.password
   * @returns {Promise<Object>} accessToken, refreshToken, and mapped administrator data.
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

    return {
      accessToken: signAccessToken(admin._id, admin.tokenVersion),
      refreshToken: signRefreshToken(admin._id, admin.tokenVersion),
      admin: toAdminDTO(admin),
    };
  };

  /**
   * Verifies a refresh token and, if still valid and unrevoked, issues a
   * fresh access + refresh token pair (sliding session).
   * @param {string} refreshToken - Raw token pulled from the adminRefreshToken cookie.
   * @returns {Promise<Object>} New accessToken and refreshToken.
   */
  const refreshAdminTokenService = async (refreshToken) => {
    if (!refreshToken) throw new AppError("No refresh token provided.", 401);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    } catch {
      throw new AppError("Invalid or expired refresh token.", 401);
    }

    if (decoded.role !== "admin" || decoded.type !== "refresh")
      throw new AppError("Invalid refresh token.", 403);

    const admin = await adminUserRepository.findAdminByIdFull(decoded.id);
    if (!admin) throw new AppError("Admin not found.", 401);
    if (!admin.isActive)
      throw new AppError("Admin account is deactivated.", 403);
    if (decoded.tokenVersion !== admin.tokenVersion)
      throw new AppError("Session has been revoked. Please log in again.", 401);

    return {
      accessToken: signAccessToken(admin._id, admin.tokenVersion),
      refreshToken: signRefreshToken(admin._id, admin.tokenVersion),
    };
  };

  /**
   * Revokes the admin's current session generation by bumping tokenVersion,
   * so the refresh token (and any outstanding access token) stop working
   * immediately — not just when the cookie is cleared client-side.
   * @param {string} refreshToken - Raw token pulled from the adminRefreshToken cookie, if present.
   * @returns {Promise<void>}
   */
  const adminLogoutService = async (refreshToken) => {
    if (!refreshToken) return;
    try {
      const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
      await adminUserRepository.incrementTokenVersion(decoded.id);
    } catch {
      // Already invalid/expired — nothing server-side left to revoke.
    }
  };

  return {
    adminLoginService,
    refreshAdminTokenService,
    adminLogoutService,
  };
};

module.exports = createAdminAuthService;
