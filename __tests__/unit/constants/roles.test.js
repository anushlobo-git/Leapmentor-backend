/**
 * @fileoverview Central RBAC Registry Unit Tests
 * @description Verifies the single source of truth for roles/permissions
 * behaves correctly — this file has no external dependencies to mock,
 * since the whole point of constants/roles.js is to be pure data + pure
 * functions.
 */

const {
  ROLES,
  ALL_ROLES,
  ROLE_PRIORITY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  isValidRole,
  getPermissionsForRoles,
  roleListHasPermission,
  getPrimaryRole,
} = require("../../../constants/roles");

describe("RBAC Registry", () => {
  describe("ROLES / ALL_ROLES", () => {
    test("ALL_ROLES is derived from ROLES, not a separately hardcoded list", () => {
      expect(ALL_ROLES).toEqual(expect.arrayContaining(Object.values(ROLES)));
      expect(ALL_ROLES).toHaveLength(Object.values(ROLES).length);
    });

    test("ROLES is frozen so a consumer cannot silently mutate the registry", () => {
      expect(Object.isFrozen(ROLES)).toBe(true);
      expect(() => {
        ROLES.MENTOR = "hacked";
      }).not.toThrow(); // non-strict assignment is a no-op, not a throw
      expect(ROLES.MENTOR).toBe("mentor");
    });
  });

  describe("isValidRole", () => {
    test("accepts every role currently in the registry", () => {
      for (const role of ALL_ROLES) {
        expect(isValidRole(role)).toBe(true);
      }
    });

    test("rejects an unknown role name", () => {
      expect(isValidRole("superadmin")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
    });
  });

  describe("getPermissionsForRoles", () => {
    test("returns the union of permissions for multiple roles, de-duplicated", () => {
      const mentorOnly = getPermissionsForRoles([ROLES.MENTOR]);
      const menteeOnly = getPermissionsForRoles([ROLES.MENTEE]);
      const both = getPermissionsForRoles([ROLES.MENTOR, ROLES.MENTEE]);

      // Every permission from either role individually must appear in the union.
      for (const p of mentorOnly) expect(both).toContain(p);
      for (const p of menteeOnly) expect(both).toContain(p);

      // No duplicates: shared permissions (e.g. SEND_MESSAGE) appear once.
      expect(new Set(both).size).toBe(both.length);
    });

    test("a mentor cannot see mentee-only permissions and vice versa", () => {
      const mentorPermissions = getPermissionsForRoles([ROLES.MENTOR]);
      const menteePermissions = getPermissionsForRoles([ROLES.MENTEE]);

      expect(mentorPermissions).toContain(PERMISSIONS.VIEW_EARNINGS);
      expect(menteePermissions).not.toContain(PERMISSIONS.VIEW_EARNINGS);

      expect(menteePermissions).toContain(PERMISSIONS.BOOK_SESSION);
      expect(mentorPermissions).not.toContain(PERMISSIONS.BOOK_SESSION);
    });

    test("returns an empty array for no roles / unrecognized roles", () => {
      expect(getPermissionsForRoles([])).toEqual([]);
      expect(getPermissionsForRoles(["ghost-role"])).toEqual([]);
      expect(getPermissionsForRoles(undefined)).toEqual([]);
      expect(getPermissionsForRoles(null)).toEqual([]);
    });
  });

  describe("roleListHasPermission", () => {
    test("true when at least one held role grants the permission", () => {
      expect(
        roleListHasPermission([ROLES.MENTEE], PERMISSIONS.BOOK_SESSION),
      ).toBe(true);
      expect(
        roleListHasPermission(
          [ROLES.MENTEE, ROLES.MENTOR],
          PERMISSIONS.VIEW_EARNINGS,
        ),
      ).toBe(true);
    });

    test("false when no held role grants the permission", () => {
      expect(
        roleListHasPermission([ROLES.MENTEE], PERMISSIONS.VIEW_EARNINGS),
      ).toBe(false);
    });

    test("false (never throws) for missing or non-array roles", () => {
      expect(roleListHasPermission(undefined, PERMISSIONS.BOOK_SESSION)).toBe(
        false,
      );
      expect(roleListHasPermission(null, PERMISSIONS.BOOK_SESSION)).toBe(false);
      expect(roleListHasPermission("mentee", PERMISSIONS.BOOK_SESSION)).toBe(
        false,
      );
    });
  });

  describe("getPrimaryRole", () => {
    test("returns null for an empty or missing roles array", () => {
      expect(getPrimaryRole([])).toBeNull();
      expect(getPrimaryRole(undefined)).toBeNull();
    });

    test("returns the only role when there is exactly one", () => {
      expect(getPrimaryRole([ROLES.MENTEE])).toBe(ROLES.MENTEE);
      expect(getPrimaryRole([ROLES.MENTOR])).toBe(ROLES.MENTOR);
    });

    test("breaks ties using ROLE_PRIORITY regardless of array order", () => {
      expect(getPrimaryRole([ROLES.MENTEE, ROLES.MENTOR])).toBe(ROLES.MENTOR);
      expect(getPrimaryRole([ROLES.MENTOR, ROLES.MENTEE])).toBe(ROLES.MENTOR);
      expect(ROLE_PRIORITY[0]).toBe(ROLES.MENTOR); // documents the current tie-break
    });

    test("falls back to the first array entry for a role outside ROLE_PRIORITY", () => {
      expect(getPrimaryRole(["future-role"])).toBe("future-role");
    });
  });

  describe("ROLE_PERMISSIONS coverage", () => {
    test("every role in ALL_ROLES has a (possibly empty) permission list defined", () => {
      for (const role of ALL_ROLES) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      }
    });
  });
});
