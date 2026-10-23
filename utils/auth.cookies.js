/**
 * @fileoverview Authentication Cookie Management Utilities
 * @description Provides decoupled handlers for setting and clearing the secure
 * HTTP-only refresh-token cookie.
 */
const env = require("../config/env");

const createCookieUtils = (config) => {
  const isProd = config.isProd ?? env.nodeEnv === "production";

  const BASE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  /**
   * Sets the refresh token cookie on the Express response object.
   */
  const setAuthCookies = (res, token) => {
    res.cookie("refreshToken", token, BASE_OPTIONS);
  };

  /**
   * Clears the authentication cookie from the client browser.
   */
  const clearAuthCookies = (res) => {
    res.clearCookie("refreshToken", BASE_OPTIONS);
  };

  return { setAuthCookies, clearAuthCookies };
};

module.exports = createCookieUtils;
