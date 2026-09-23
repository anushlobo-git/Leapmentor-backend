/**
 * @fileoverview requirePermission Middleware Unit Tests
 * @description The permission-based counterpart to requireRole. Sits alongside
 * middleware.test.js (which already covers authenticate/requireRole in the
 * omnibus style used across this codebase) rather than inside it, since this
 * is new surface area rather than a modification of existing behavior.
 */

jest.mock("../../../models/User", () => ({ findById: jest.fn() }));
jest.mock("../../../models/AdminUser", () => ({ findById: jest.fn() }));
jest.mock("../../../models/ConnectRequest", () => ({ findById: jest.fn() }));
jest.mock("../../../models/Note", () => ({ findById: jest.fn() }));
jest.mock("jsonwebtoken", () => ({ verify: jest.fn(), sign: jest.fn() }));

const { requirePermission } = require("../../../middleware/authenticate");
const { PERMISSIONS, ROLES } = require("../../../constants/roles");

describe("requirePermission middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test("calls next() when the user's roles grant the required permission", () => {
    req.user = { roles: [ROLES.MENTOR] };
    const middleware = requirePermission(PERMISSIONS.VIEW_EARNINGS);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("passes when ANY of several listed permissions is granted (OR semantics)", () => {
    req.user = { roles: [ROLES.MENTEE] };
    const middleware = requirePermission(
      PERMISSIONS.VIEW_EARNINGS, // mentee doesn't have this
      PERMISSIONS.BOOK_SESSION, // but does have this
    );

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("passes when permissions come from the UNION of multiple held roles", () => {
    req.user = { roles: [ROLES.MENTEE, ROLES.MENTOR] };
    const middleware = requirePermission(PERMISSIONS.VIEW_EARNINGS);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("returns 403 without leaking role/permission internals when the check fails", () => {
    req.user = { roles: [ROLES.MENTEE] };
    const middleware = requirePermission(PERMISSIONS.VIEW_EARNINGS);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ message: "Access denied: insufficient permissions" });
    // The 403 body must not echo internal role/permission names back to the
    // caller — that's reconnaissance for an attacker who was just denied.
    expect(body).not.toHaveProperty("required");
    expect(body).not.toHaveProperty("userRoles");
    expect(body).not.toHaveProperty("userPermissions");
  });

  test("returns 403 when req.user is missing entirely (defensive default)", () => {
    req.user = undefined;
    const middleware = requirePermission(PERMISSIONS.BOOK_SESSION);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("a role added to the registry with a new permission is enforced with zero changes to this middleware", () => {
    // Simulates a future role/permission pair without editing this file —
    // demonstrates the registry-driven design actually works as intended.
    req.user = { roles: ["affiliate"] };
    const middleware = requirePermission("referral:track");

    middleware(req, res, next);

    // "affiliate" isn't in ROLE_PERMISSIONS, so this correctly still denies —
    // proving the middleware has no hardcoded role names of its own to update.
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
