/**
 * @fileoverview User Authentication Router Unit Tests
 * @description Validates routing matrix setups, matching endpoint bindings,
 * and inline session logout cookie clearing logic completely in memory.
 */

const createAuthRoutes = require("../../../routes/auth.routes");

// Globally isolate the express router layer to monitor entry endpoint triggers
const mockRouter = {
  post: jest.fn(),
  get: jest.fn(),
};
jest.mock("express", () => ({
  Router: () => mockRouter,
}));

describe("User Authentication Router Unit Tests", () => {
  let mockControllers;
  let mockValidations;
  let mockCookieUtils;

  beforeEach(() => {
    mockControllers = {
      registerController: { register: jest.fn() },
      loginController: { login: jest.fn() },
      googleAuthController: { googleAuth: jest.fn() },
      socialAuthController: { socialAuth: jest.fn() },
      refreshController: { refreshToken: jest.fn() },
      linkedinAuthController: {
        linkedinRedirect: jest.fn(),
        linkedinCallback: jest.fn(),
        linkedinAuth: jest.fn(),
      },
    };

    mockValidations = {
      registerValidation: "v_register",
      loginValidation: "v_login",
      googleAuthValidation: "v_google",
      linkedinAuthValidation: "v_linkedin",
      refreshTokenCookieValidation: "v_refresh",
    };

    mockCookieUtils = {
      clearAuthCookies: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should anchor local auth endpoints to matching controller methods and validation guards", () => {
    createAuthRoutes({
      controllers: mockControllers,
      validations: mockValidations,
      cookieUtils: mockCookieUtils,
    });

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/register",
      "v_register",
      mockControllers.registerController.register,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/login",
      "v_login",
      mockControllers.loginController.login,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/refresh",
      "v_refresh",
      mockControllers.refreshController.refreshToken,
    );
  });

  test("should attach social federated identity endpoints using proper HTTP verbs", () => {
    createAuthRoutes({
      controllers: mockControllers,
      validations: mockValidations,
      cookieUtils: mockCookieUtils,
    });

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/google",
      "v_google",
      mockControllers.googleAuthController.googleAuth,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/social",
      mockControllers.socialAuthController.socialAuth,
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/linkedin",
      mockControllers.linkedinAuthController.linkedinRedirect,
    );
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/linkedin/callback",
      mockControllers.linkedinAuthController.linkedinCallback,
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/linkedin/token",
      "v_linkedin",
      mockControllers.linkedinAuthController.linkedinAuth,
    );
  });

  test("should execute an inline handler on /logout to scrub cookies and return a 200 status code", () => {
    createAuthRoutes({
      controllers: mockControllers,
      validations: mockValidations,
      cookieUtils: mockCookieUtils,
    });

    // Extract the inline execution block registered for the logout path
    const logoutMatch = mockRouter.post.mock.calls.find(
      (call) => call[0] === "/logout",
    );
    expect(logoutMatch).toBeDefined();

    const logoutHandlerFunction = logoutMatch[1];
    const mockReq = {};
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    logoutHandlerFunction(mockReq, mockRes);

    expect(mockCookieUtils.clearAuthCookies).toHaveBeenCalledWith(mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Logged out successfully",
    });
  });
});
