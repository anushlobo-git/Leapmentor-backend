/**
 * @fileoverview Central RBAC (Role-Based Access Control) Registry
 * @description
 * This file is the ONLY place in the backend that lists which roles exist,
 * which permissions exist, and which permissions each role grants.
 *
 * Why this file exists
 * ---------------------
 * Before this change, "is this user allowed to do X" was answered in three
 * different, disconnected places that all had to agree by coincidence:
 *   1. models/User.js          — a hardcoded enum + a validator that only
 *                                 permitted EXACTLY ONE role per account.
 *   2. utils/auth.utils.js     — a second, separately hardcoded Set of
 *                                 valid role names (validateRoles).
 *   3. middleware/authenticate — direct `role === "mentor"` style checks
 *                                 scattered across route files.
 *
 * Adding a new role (e.g. "moderator", "affiliate") meant hunting down and
 * editing all three, plus every route file that had hardcoded a role check.
 * Miss one and you get an inconsistency bug, not a compile error.
 *
 * How to add a new role now
 * --------------------------
 * 1. Add it to ROLES below.
 * 2. Add an entry for it in ROLE_PERMISSIONS (even an empty array is fine
 *    to start with).
 * 3. Optionally add it to ROLE_PRIORITY if it should participate in
 *    "which role wins when a user has several" logic (dashboard redirects,
 *    for example).
 * That's it — models/User.js, the registration validator, and every route
 * using requireRole/requirePermission all pick this up automatically,
 * because they all read from this file instead of hardcoding names.
 *
 * Why "admin" is NOT in this file
 * ---------------------------------
 * Admins are modeled as a completely separate authentication domain:
 * a separate collection (models/AdminUser.js), a separate login endpoint,
 * a separate token/cookie, and separate middleware (adminAuthenticate).
 * That separation is a deliberate security boundary — a bug in the
 * mentor/mentee role system can never accidentally grant admin access,
 * because there is no shared code path between the two. This registry
 * governs *user account* roles only (the roles a mentor/mentee account
 * can hold). See docs/RBAC.md for the full reasoning.
 */

/** Every role a User document (models/User.js) may hold. */
const ROLES = Object.freeze({
  MENTOR: "mentor",
  MENTEE: "mentee",
});

/** Flat array form of ROLES — used for Mongoose enum validation, Joi, etc. */
const ALL_ROLES = Object.freeze(Object.values(ROLES));

/**
 * When a user holds more than one role and something needs to pick a
 * single "primary" one (e.g. which dashboard to land on after login), this
 * list breaks the tie. Earlier entries win. A new role that should never win
 * a tie simply
 * isn't listed here — getPrimaryRole() falls back to "first role found".
 */
const ROLE_PRIORITY = Object.freeze([ROLES.MENTOR, ROLES.MENTEE]);

/**
 * Every fine-grained permission in the system. Permissions describe an
 * ACTION ("book a session"), not a role — that separation is what lets a
 * future role reuse an existing permission instead of duplicating logic.
 * Naming convention: "resource:action".
 */
const PERMISSIONS = Object.freeze({
  // Mentee-side actions
  BOOK_SESSION: "session:book",
  SEARCH_MENTORS: "mentor:search",
  SUBMIT_FEEDBACK: "feedback:submit",
  MANAGE_GOALS: "goal:manage",

  // Mentor-side actions
  MANAGE_AVAILABILITY: "availability:manage",
  RESPOND_TO_CONNECT_REQUEST: "connect_request:respond",
  VIEW_EARNINGS: "earnings:view",
  UPLOAD_VERIFICATION_DOCS: "verification:upload",

  // Actions available to any authenticated account holding either role
  SEND_MESSAGE: "message:send",
  UPLOAD_NOTE: "note:upload",
  MANAGE_PRIVATE_NOTES: "private_note:manage",
  SUBMIT_REPORT: "report:submit",
});

/**
 * The role → permissions map. This is the piece that actually decides
 * "what can a mentor do" / "what can a mentee do". Changing what a role
 * is allowed to do is a change to this object only.
 */
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.MENTEE]: Object.freeze([
    PERMISSIONS.BOOK_SESSION,
    PERMISSIONS.SEARCH_MENTORS,
    PERMISSIONS.SUBMIT_FEEDBACK,
    PERMISSIONS.MANAGE_GOALS,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.UPLOAD_NOTE,
    PERMISSIONS.MANAGE_PRIVATE_NOTES,
    PERMISSIONS.SUBMIT_REPORT,
  ]),
  [ROLES.MENTOR]: Object.freeze([
    PERMISSIONS.MANAGE_AVAILABILITY,
    PERMISSIONS.RESPOND_TO_CONNECT_REQUEST,
    PERMISSIONS.VIEW_EARNINGS,
    PERMISSIONS.UPLOAD_VERIFICATION_DOCS,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.UPLOAD_NOTE,
    PERMISSIONS.MANAGE_PRIVATE_NOTES,
    PERMISSIONS.SUBMIT_REPORT,
  ]),
});

/**
 * Is this a role name the system recognizes?
 * @param {string} role
 * @returns {boolean}
 */
const isValidRole = (role) => ALL_ROLES.includes(role);

/**
 * Flattens a user's roles array into the de-duplicated set of permissions
 * those roles grant, in aggregate. A user with ["mentor", "mentee"] gets
 * the UNION of both role's permissions, not just one.
 * @param {string[]} roles
 * @returns {string[]} de-duplicated permission strings
 */
const getPermissionsForRoles = (roles = []) => {
  // Default params only cover `undefined`; null / a bare string / an object
  // would otherwise reach the for...of below and either throw or iterate
  // characters. Anything that isn't an array grants nothing.
  if (!Array.isArray(roles)) return [];
  const permissionSet = new Set();
  for (const role of roles) {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    for (const permission of rolePermissions) permissionSet.add(permission);
  }
  return [...permissionSet];
};

/**
 * True if the aggregate permission set for `roles` includes `permission`.
 * @param {string[]} roles
 * @param {string} permission
 * @returns {boolean}
 */
const roleListHasPermission = (roles, permission) =>
  getPermissionsForRoles(roles).includes(permission);

/**
 * Picks one "primary" role out of an account's roles array, for contexts
 * that need exactly one (a routing-hint cookie, a default post-login
 * redirect). Ties are broken by ROLE_PRIORITY; a role that isn't in the
 * priority list is only used if nothing higher-priority is present.
 * @param {string[]} roles
 * @returns {string | null}
 */
const getPrimaryRole = (roles = []) => {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) return candidate;
  }
  return roles[0] ?? null;
};

module.exports = {
  ROLES,
  ALL_ROLES,
  ROLE_PRIORITY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  isValidRole,
  getPermissionsForRoles,
  roleListHasPermission,
  getPrimaryRole,
};
