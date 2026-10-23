// src/middleware/authenticate.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../config/logger");
const env = require("../config/env");
const { getPermissionsForRoles } = require("../constants/roles");

// Verifies JWT and attaches fresh user from DB to req.user
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, env.jwtAccessSecret);

    // Fetch fresh from DB (Bypass the isDeleted filter so we can check it manually!)
    const user = await User.findById(decoded.id)
      .select("-password")
      .setOptions({ ignoreIsDeleted: true });

    if (!user) return res.status(401).json({ message: "User not found" });

    // ACTIVE SESSION KILLER
    // If the admin blocked them while they were logged in, this stops their next request!
    if (user.isDeleted) {
      return res.status(403).json({
        message: "Your account has been blocked by an administrator.",
      });
    }

    req.user = user;

    logger.info("Authenticated user", {
      userId: user._id,
      email: user.email,
      // Log the FULL roles array, not just roles[0] — a debug log that only
      // shows one role is exactly the kind of hidden assumption that made
      // multi-role accounts hard to reason about.
      roles: user.roles,
    });

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Role guard — use after `authenticate`.
 *
 * `requireRole("mentor", "admin")` passes if the authenticated user holds
 * ANY of the listed roles (OR semantics) — unchanged from before. This is
 * kept around for routes that are naturally "by role" (e.g. an entire
 * router is mentor-only). For finer-grained, action-level checks that
 * should survive a future role rename or a role being split in two,
 * prefer `requirePermission` below.
 *
 * Route files do not need to change to pick up new roles: this function
 * only ever compares against `req.user.roles`, which is populated from
 * whatever the central registry (constants/roles.js) currently allows.
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];

    logger.info("Role check", { required: roles, userRoles });

    const hasRole = roles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      // Details (which roles were required / which roles the caller has)
      // go to the log, not the response body — a 403 body that echoes
      // the app's internal role model back to a caller who was just told
      // they lack permission is free reconnaissance for an attacker.
      return res.status(403).json({
        message: "Access denied: insufficient role",
      });
    }
    next();
  };
};

/**
 * Permission guard — use after `authenticate`.
 *
 * `requirePermission(PERMISSIONS.VIEW_EARNINGS)` passes if ANY role the
 * user holds grants that permission (OR semantics, same as requireRole).
 * This is the guard to reach for going forward: it describes the ACTION
 * being protected ("view earnings") rather than which role happens to be
 * allowed to do it today. If a permission is ever reassigned to a
 * different role, or a new role is introduced that should also get it,
 * only constants/roles.js (ROLE_PERMISSIONS) changes — every route using
 * requirePermission keeps working unmodified.
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const userPermissions = getPermissionsForRoles(userRoles);

    logger.info("Permission check", {
      required: permissions,
      userRoles,
      userPermissions,
    });

    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission),
    );
    if (!hasPermission) {
      return res.status(403).json({
        message: "Access denied: insufficient permissions",
      });
    }
    next();
  };
};

module.exports = { authenticate, requireRole, requirePermission };
