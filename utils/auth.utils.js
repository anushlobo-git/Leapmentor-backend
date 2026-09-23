/**
 * @fileoverview Authentication Cryptographic Utilities Factory
 * @description Provides decoupled, parameter-driven methods for token signing,
 * state signatures generation, and platform user role verification checks.
 */

const { isValidRole, ALL_ROLES } = require("../constants/roles");

const createAuthUtils = (config, jwt, crypto, googleClient) => {
  const {
    jwtSecret,
    jwtExpiresIn = "7d",
    jwtAccessSecret,
    jwtRefreshSecret,
    stateSecret,
  } = config;

  /**
   * Generates a standard baseline user identifier JSON Web Token block.
   */
  const signToken = (userId) => {
    return jwt.sign({ id: userId }, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });
  };

  /**
   * Issues a transient, short-lived session access verification key.
   */
  const signAccessToken = (userId) =>
    jwt.sign({ id: userId, type: "access" }, jwtAccessSecret, {
      expiresIn: "15m",
    });

  /**
   * Issues a long-lived persistence session refresh rotation token.
   */
  const signRefreshToken = (userId) =>
    jwt.sign({ id: userId, type: "refresh" }, jwtRefreshSecret, {
      expiresIn: "7d",
    });

  /**
   * Screens and aggregates arrays containing incoming platform access permissions flags.
   * Valid role names come from the single central registry (constants/roles.js)
   * rather than a second hardcoded list here, so this function automatically
   * recognizes any role added there — no edit needed in this file.
   */
  const validateRoles = (roles) => {
    if (!Array.isArray(roles) || roles.length === 0) {
      return {
        valid: false,
        message: `At least one role is required. Use one or more of: ${ALL_ROLES.join(", ")}.`,
      };
    }
    const uniqueRoles = [...new Set(roles)];
    for (const r of uniqueRoles) {
      if (!isValidRole(r)) {
        return {
          valid: false,
          message: `Invalid role "${r}". Use one or more of: ${ALL_ROLES.join(", ")}.`,
        };
      }
    }
    return { valid: true, uniqueRoles };
  };

  /**
   * Encodes payload contexts appending a verifiable HMAC metadata integrity hash signature.
   */
  const signState = (payload) => {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64");
    const sig = crypto
      .createHmac("sha256", stateSecret)
      .update(data)
      .digest("hex");
    return `${data}.${sig}`;
  };

  /**
   * Decodes parameter states verifying they match original signature metrics untampered.
   */
  const verifyState = (state) => {
    const [data, sig] = state.split(".");
    const expected = crypto
      .createHmac("sha256", stateSecret)
      .update(data)
      .digest("hex");
    if (sig !== expected) throw new Error("Invalid state parameter");
    return JSON.parse(Buffer.from(data, "base64").toString());
  };

  return {
    googleClient,
    signToken,
    validateRoles,
    signState,
    verifyState,
    signAccessToken,
    signRefreshToken,
  };
};

module.exports = createAuthUtils;
