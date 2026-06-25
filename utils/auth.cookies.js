/**
 * @fileoverview Authentication Cookie Management Utilities
 * @description Provides decoupled handlers for setting and clearing secure HTTP-only
 * authentication and metadata cookies based on injected environment configuration parameters.
 */

const createCookieUtils = (config) => {
  const isProd = config.isProd ?? process.env.NODE_ENV === "production";

  const BASE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  /**
   * Sets the refresh token and role cookies on the Express response object.
   */
  const setAuthCookies = (res, token, role) => {
    res.cookie("refreshToken", token, BASE_OPTIONS);
    if (role) {
      res.cookie("authRole", role, {
        ...BASE_OPTIONS,
        httpOnly: false, // frontend needs to read role for routing
      });
    }
  };

  /**
   * Clears the authentication and role cookies from the client browser.
   */
  const clearAuthCookies = (res) => {
    res.clearCookie("refreshToken", BASE_OPTIONS);
    res.clearCookie("authRole", { ...BASE_OPTIONS, httpOnly: false });
  };

  return { setAuthCookies, clearAuthCookies };
};

module.exports = createCookieUtils;
