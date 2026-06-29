/**
 * @fileoverview Social Authentication Controller Unit Tests
 */

const createSocialAuthController = require("../../../controllers/socialAuth.controller");

describe("Social Authentication Controller Unit Tests", () => {
  let mockSocialAuthService, mockCookieUtils, mockLogger, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockSocialAuthService = { socialAuthUser: jest.fn() };
    mockCookieUtils = { setAuthCookies: jest.fn() };
    mockLogger = { warn: jest.fn() };
    controller = createSocialAuthController({
      socialAuthService: mockSocialAuthService,
      cookieUtils: mockCookieUtils,
      logger: mockLogger,
    });
    mockReq = { body: { provider: "linkedin", providerId: "lnk_123" } };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  afterEach(() => { jest.clearAllMocks(); });

  test("should return 200 and set secure tokens when supplied valid federated social logins", async () => {
    const mockServicePayload = {
      accessToken: "access_token_jwt",
      refreshToken: "refresh_token_jwt",
      user: { _id: "u12", name: "Bob", roles: ["mentor"] },
      isNewUser: false,
    };
    mockSocialAuthService.socialAuthUser.mockResolvedValue(mockServicePayload);

    await controller.socialAuth(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockSocialAuthService.socialAuthUser).toHaveBeenCalledWith(mockReq.body);
    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(mockRes, "refresh_token_jwt", "mentor");
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Social login successful",
      user: mockServicePayload.user,
      accessToken: "access_token_jwt",
      isNewUser: false,
    });
  });

  test("should handle user with no roles and set null role in cookie", async () => {
    const mockServicePayload = {
      accessToken: "access_token_jwt",
      refreshToken: "refresh_token_jwt",
      user: { _id: "u12", name: "Bob" },
      isNewUser: false,
    };
    mockSocialAuthService.socialAuthUser.mockResolvedValue(mockServicePayload);

    await controller.socialAuth(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(mockRes, "refresh_token_jwt", null);
  });

  test("should map a 400 bad request status code if the service throws a TERMS_NOT_ACCEPTED validation error", async () => {
    mockSocialAuthService.socialAuthUser.mockRejectedValue(new Error("TERMS_NOT_ACCEPTED"));

    await controller.socialAuth(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "You must accept terms to continue" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("should pass unmapped systemic processing failures to next() for global catching middleware", async () => {
    const criticalError = new Error("Database network heartbeat timed out");
    mockSocialAuthService.socialAuthUser.mockRejectedValue(criticalError);

    await controller.socialAuth(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(criticalError);
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
