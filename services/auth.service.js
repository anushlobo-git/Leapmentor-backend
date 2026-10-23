//Leapmentor-backend/services/auth.service.js
/**
 * @fileoverview User Authentication Service
 * @description Business logic for account provisioning, secure credential verification,
 * session tokens orchestration, and password lifecycle modifications via parameter injection.
 */

const AppError = require("../utils/AppError");
const { toUserDTO } = require("../mappers/user.mapper");
const { isValidRole, ALL_ROLES } = require("../constants/roles");

const BCRYPT_SALT_REGISTER = 10;

const createAuthService = ({
  userRepository,
  walletService,
  authUtils,
  bcrypt,
}) => {
  /**
   * Handles a submission to the public register form.
   *
   * One email = one account that can hold several roles, so "this email is
   * taken" is no longer a dead end. Depending on what already exists, a
   * register submission resolves to one of four outcomes:
   *
   *   - "created"            brand-new email → normal registration.
   *   - "role_added"         the account's owner is adding a role it didn't
   *                          have yet (e.g. a mentee who now also wants to
   *                          mentor). Auto-logged-in when the email is already
   *                          verified, otherwise routed back through
   *                          verification.
   *   - "already_registered" the owner already holds the requested role(s) →
   *                          nothing to create. Same session rule as
   *                          role_added: auto-logged-in when verified,
   *                          otherwise routed through verification.
   *   - "login_required"     the email exists but the submitted password does
   *                          NOT match it → we can't prove ownership, so the
   *                          account is left completely untouched and the
   *                          caller is sent to login.
   *
   * Ownership check: adding a role provisions a wallet and grants new access,
   * so for any existing email we require the submitted password to match the
   * stored one before touching the account. A stranger who knows an email but
   * not its password can neither add a role to it nor learn whether the role
   * already existed — both "wrong password" and "already has the role" resolve
   * to the same "go log in" answer.
   */
  const registerUser = async ({ name, email, password, roles }) => {
    const normalizedEmail = String(email).toLowerCase().trim();
    const { valid, message, uniqueRoles } = authUtils.validateRoles(roles);
    if (!valid) {
      throw new AppError(message, 400);
    }

    // Look the account up WITH the (normally excluded) password hash so we can
    // verify ownership below without a second query.
    const existing =
      await userRepository.findUserByEmailWithPassword(normalizedEmail);

    // ── Outcome "created": brand-new email → normal registration ──
    if (!existing) {
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
        outcome: "created",
        isNewUser: true,
        loggedIn: false,
        accessToken,
        refreshToken,
        user: toUserDTO(user),
      };
    }

    // ── Email exists → prove ownership before doing anything ──
    const ownsAccount =
      !!existing.password &&
      (await bcrypt.compare(password, existing.password));

    if (!ownsAccount) {
      // Deliberately indistinguishable from "already_registered" to a caller
      // who does NOT own the account: no role is added, nothing is revealed.
      return {
        outcome: "login_required",
        isNewUser: false,
        loggedIn: false,
        email: normalizedEmail,
      };
    }

    const missingRoles = uniqueRoles.filter(
      (r) => !existing.roles?.includes(r),
    );

    // Issues a real session (auto-login) for an existing, VERIFIED account the
    // caller has just proven ownership of. Unverified accounts must still clear
    // the same verification gate that login enforces (loginUser throws 403
    // until verified), so those are routed back through email verification
    // rather than handed a session they can't use.
    const sessionFor = (outcome, account) => {
      if (account.isEmailVerified) {
        return {
          outcome,
          isNewUser: false,
          loggedIn: true,
          accessToken: authUtils.signAccessToken(account._id),
          refreshToken: authUtils.signRefreshToken(account._id),
          user: toUserDTO(account),
        };
      }
      return {
        outcome,
        isNewUser: false,
        loggedIn: false,
        email: normalizedEmail,
        user: toUserDTO(account),
      };
    };

    // ── Outcome "already_registered": owner already holds the role(s) ──
    // They've proven ownership (password matched), so there's nothing to
    // create — just log them straight into their dashboard when verified,
    // otherwise send them to verify their email first.
    if (missingRoles.length === 0) {
      return sessionFor("already_registered", existing);
    }

    // ── Outcome "role_added": owner is adding a role they lacked ──
    // Reuses the same atomic $addToSet + per-role wallet provisioning as the
    // authenticated "become a mentor too" path (addAccountRole).
    let updatedUser = existing;
    for (const role of missingRoles) {
      updatedUser = await userRepository.addRoleToUser(existing._id, role);
      await walletService.createWalletForRole(existing._id, role);
    }

    return sessionFor("role_added", updatedUser);
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

  /**
   * Adds an additional role to an ALREADY AUTHENTICATED user's own account
   * ("become a mentor too" / "become a mentee too"). This is the concrete
   * capability that the old schema (roles.length === 1) made impossible —
   * a single account can now legitimately hold more than one role.
   *
   * Deliberately self-service only: `currentUser` must be the account
   * making the request (enforced by the controller passing req.user),
   * never an id read from the request body. Adding a role to someone
   * ELSE's account is an admin action, not this one.
   */
  const addAccountRole = async (currentUser, role) => {
    if (!isValidRole(role)) {
      throw new AppError(
        `Invalid role "${role}". Use one of: ${ALL_ROLES.join(", ")}.`,
        400,
      );
    }
    if (currentUser.roles?.includes(role)) {
      throw new AppError(`Your account already has the "${role}" role.`, 409);
    }

    const updatedUser = await userRepository.addRoleToUser(
      currentUser._id,
      role,
    );
    if (!updatedUser) {
      throw new AppError("Account not found.", 404);
    }

    // A wallet is created per-role (see wallet.service.js) — a mentee who
    // becomes a mentor needs a mentor-side wallet just as much as someone
    // who registered as a mentor from the start.
    await walletService.createWalletForRole(currentUser._id, role);

    return toUserDTO(updatedUser);
  };

  return {
    registerUser,
    loginUser,
    addAccountRole,
  };
};

module.exports = createAuthService;
