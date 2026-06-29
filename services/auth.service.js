//Leapmentor-backend/services/auth.service.js
/**
 * @fileoverview User Authentication Service
 * @description Business logic for account provisioning, secure credential verification,
 * session tokens orchestration, and password lifecycle modifications via parameter injection.
 */

const AppError = require("../utils/AppError");
const { toUserDTO } = require("../mappers/user.mapper");

const BCRYPT_SALT_REGISTER = 10;

const createAuthService = ({
  userRepository,
  walletService,
  authUtils,
  bcrypt,
}) => {
  /**
   * Registers a brand-new platform user with a cryptographically hashed password.
   */
  const registerUser = async ({
    name,
    email,
    password,
    roles,
    termsAccepted,
  }) => {
    const normalizedEmail = String(email).toLowerCase().trim();
    const { valid, message, uniqueRoles } = authUtils.validateRoles(roles);
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

    await walletService.createWalletsForRoles(user._id, uniqueRoles);

    const accessToken = authUtils.signAccessToken(user._id);
    const refreshToken = authUtils.signRefreshToken(user._id);

    return {
      accessToken,
      refreshToken,
      user: toUserDTO(user),
      isNewUser: true,
    };
  };

  /**
   * Authenticates a user profile checking provided email and password credentials.
   */
  const loginUser = async ({ email, password }) => {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user =
      await userRepository.findUserByEmailWithPassword(normalizedEmail);

    if (!user?.password) {
      throw new AppError("Invalid email or password.", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password.", 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError("Please verify your email address to log in.", 403);
    }

    const accessToken = authUtils.signAccessToken(user._id);
    const refreshToken = authUtils.signRefreshToken(user._id);

    return {
      accessToken,
      refreshToken,
      user: toUserDTO(user),
      isNewUser: true,
    };
  };

  return {
    registerUser,
    loginUser,
  };
};

module.exports = createAuthService;
