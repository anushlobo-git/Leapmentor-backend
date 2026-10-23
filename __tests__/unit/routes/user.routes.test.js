/**
 * @fileoverview User Profile Lifecycle Routing Unit Tests
 * @description Audits endpoint registrations and middleware wiring for the
 * user self-service router — profile lookup and RBAC self-service role
 * management (PATCH /me/roles).
 */

const createUserRoutes = require("../../../routes/user.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  use: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("User Profile Router Configuration Matrix", () => {
  let mockAuthenticate;
  let mockUserController;
  let mockValidations;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthenticate = "middleware_jwt_auth_spy_token";
    mockUserController = {
      getMe: "controller_get_me_spy_token",
      addRole: "controller_add_role_spy_token",
    };
    mockValidations = {
      addRoleValidation: "validation_add_role_spy_token",
    };

    createUserRoutes({
      userController: mockUserController,
      authenticate: mockAuthenticate,
      validations: mockValidations,
    });
  });

  describe("Security Framework Checks", () => {
    test("should place the identity token guard ahead of every route on this router", () => {
      // authenticate is mounted once, router-wide, via router.use — every
      // route registered after it inherits the guard automatically, so a
      // future route added to this file can't accidentally ship unguarded.
      expect(mockRouter.use).toHaveBeenCalledWith(
        "middleware_jwt_auth_spy_token",
      );
    });
  });

  describe("Route wiring", () => {
    test("should wire GET /me to the userController's getMe handler", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/me",
        "controller_get_me_spy_token",
      );
    });

    test("should wire PATCH /me/roles through validation to the userController's addRole handler", () => {
      // Order matters: validation runs before the controller, exactly like
      // every other validated route in the app (see 06-validation-layer.md
      // in the backend docs) — celebrate rejects a malformed `role` before
      // any service code runs.
      expect(mockRouter.patch).toHaveBeenCalledWith(
        "/me/roles",
        "validation_add_role_spy_token",
        "controller_add_role_spy_token",
      );
    });

    test("should NOT gate PATCH /me/roles behind requireRole", () => {
      // This is deliberate, not an oversight: requireRole would check for a
      // role the caller is, by definition, trying to acquire. Assert that
      // patch was called with exactly 3 arguments (path, validation,
      // controller) — a requireRole middleware slipped in here would
      // change this to 4 and silently lock every user out of the endpoint.
      expect(mockRouter.patch.mock.calls[0]).toHaveLength(3);
    });
  });
});
