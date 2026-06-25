/**
 * @fileoverview User Router In-Memory Unit Tests
 * @description Audits endpoint paths registration, authentication middleware hooks placement,
 * and confirms that the inline handler correctly streams req.user snapshots.
 */

const createUserRoutes = require("../../../routes/user.routes");

// Spy wrapper isolating the Express Router subsystem from network overhead
const mockRouter = {
  get: jest.fn(),
};
jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("User Router Unit Tests (Inline Logic)", () => {
  let mockAuthenticate;

  beforeEach(() => {
    mockAuthenticate = "middleware_jwt_auth_spy_token";
    jest.clearAllMocks();
  });

  test("should anchor the /me route behind passport authentication guards", () => {
    createUserRoutes(mockAuthenticate);

    expect(mockRouter.get).toHaveBeenCalledWith(
      "/me",
      "middleware_jwt_auth_spy_token",
      expect.any(Function),
    );
  });

  test("inline handler should map request passport data straight into a json response stream", async () => {
    createUserRoutes(mockAuthenticate);

    // Extract the third argument (the inline async route handler) from the first spy call
    const inlineRouteHandler = mockRouter.get.mock.calls[0][2];

    const mockProfileSnapshot = {
      _id: "507f1f78c24a82117184851a",
      name: "Developer Peer",
      email: "peer@leapmentor.com",
      role: "mentee",
    };

    const mockReq = { user: mockProfileSnapshot };
    const mockRes = {
      json: jest.fn(),
    };

    // Trigger the inline handler directly
    await inlineRouteHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledTimes(1);
    expect(mockRes.json).toHaveBeenCalledWith(mockProfileSnapshot);
  });
});
