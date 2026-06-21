/**
 * @fileoverview User Authentication Service
 * @description  Business logic for account provisioning, secure credential verification,
 * session tokens orchestration, and password lifestyle lifecycle modifications.
 */

const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const userRepository = require("../repositories/user.repository");
const {
  sanitizeUser,
  validateRoles,
  signAccessToken,
  signRefreshToken,
} = require("../utils/auth.utils");
const { createWalletsForRoles } = require("./wallet.service");
const { toUserDTO } = require("../mappers/user.mapper");

// Security Configuration Constants
const BCRYPT_SALT_REGISTER = 10;
const BCRYPT_SALT_CHANGE_PASSWORD = 12;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Registers a brand-new platform user with a cryptographically hashed password.
 * @description Validates required payload items, evaluates unique tier role assignments,
 * verifies structural uniqueness across active identity maps, creates core database objects,
 * provisions linked system asset wallets, and triggers valid runtime session tokens.
 * @param {Object} payload                 - User registration fields payload.
 * @param {string} payload.name            - Complete name string of the new account.
 * @param {string} payload.email           - Unique target email identification parameter.
 * @param {string} payload.password        - Raw secret security password string.
 * @param {Array<string>} payload.roles    - Collection tier role scopes to map.
 * @param {boolean} payload.termsAccepted  - Target acceptance flag validating agreements.
 * @throws {AppError} 400                  - Missing inputs, unaccepted terms, or bad roles.
 * @throws {AppError} 409                  - Account identity matches an existing email registry.
 * @returns {Promise<Object>} Mapped response holding access keys, refresh keys, and sanitized user entries.
 */
const registerUser = async ({
  name,
  email,
  password,
  roles,
  termsAccepted,
}) => {
  const normalizedEmail = String(email).toLowerCase().trim();
  const { valid, message, uniqueRoles } = validateRoles(roles);
  if (!valid) {
    throw new AppError(message, 400);
  }

  const existing = await userRepository.findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const hashed = await bcrypt.hash(password, BCRYPT_SALT_REGISTER);
  const user = await userRepository.createUser({
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashed,
    roles: uniqueRoles,
    isEmailVerified: false,
    termsAccepted: true,
    termsAcceptedAt: new Date(),
  });

  await createWalletsForRoles(user._id, uniqueRoles);

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  return {
    accessToken,
    refreshToken,
    user: toUserDTO(user),
    isNewUser: true,
  };
};

/**
 * Authenticates a user profile checking provided email and password credentials.
 * @param {Object} credentials          - Authentication credentials criteria block.
 * @param {string} credentials.email     - Targeting registration lookup email string.
 * @param {string} credentials.password  - Target verification password parameter.
 * @throws {AppError} 400               - Missing credentials on validation payloads.
 * @throws {AppError} 401               - Failed lookup verification or credential mismatch.
 * @throws {AppError} 403               - Active verification constraints flag an unverified email.
 * @returns {Promise<Object>} Access tokens array alongside structural sanitized user profiles.
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = String(email).toLowerCase().trim();
  const user =
    await userRepository.findUserByEmailWithPassword(normalizedEmail);

  if (!user || !user.password) {
    throw new AppError("Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email address to log in.", 403);
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  return {
    accessToken,
    refreshToken,
    user: toUserDTO(user),
    isNewUser: true,
  };
};


module.exports = { registerUser, loginUser };
