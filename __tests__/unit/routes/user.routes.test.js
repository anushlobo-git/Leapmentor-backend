/**
 * @fileoverview User Profile Lifecycle Routing Unit Tests
 * @description Audits endpoint registrations, passport identity checkpoint placement,
 * and confirms that the inline route handler correctly passes req.user snapshots.
 */

const createUserRoutes = require("../../../routes/user.routes");

// Isolate the global express router layer to monitor endpoint registration hooks
const mockRouter = {
  get: jest.fn(),
};

jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("User Profile Router Configuration Matrix", () => {
  let mockAuthenticate;

  beforeEach(() => {
    mockAuthenticate = "middleware_jwt_auth_spy_token";
    jest.clearAllMocks();

    // Instantiate using destructured object keys
    createUserRoutes({ authenticate: mockAuthenticate });
  });

  describe("Security Framework Checks", () => {
    test("should anchor the /me lookup route behind the provided identity token guard", () => {
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/me",
        "middleware_jwt_auth_spy_token",
        expect.any(Function),
      );
    });
  });

  describe("Inline Request Profile Handler", () => {
    test("should map incoming request session user profiles straight into a json response stream", async () => {
      // Pull the third element (the inline async route handler execution block) from the get spy tracking matrix
      const inlineRouteHandler = mockRouter.get.mock.calls[0][2];

      const mockProfileSnapshot = {
        _id: "507f1f78c24a82117184851a",
        name: "Verified User Core",
        email: "identity@leapmentor.com",
        role: "mentee",
      };

      const mockReq = { user: mockProfileSnapshot };
      const mockRes = {
        json: jest.fn(),
      };

      // Force-trigger the captured inline asynchronous route handler
      await inlineRouteHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith(mockProfileSnapshot);
    });
  });
});
