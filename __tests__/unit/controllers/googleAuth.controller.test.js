/**
 * @fileoverview Google Authentication Controller Unit Tests
 * @description Validates incoming parameter parsing gates, response signatures,
 * and fallback pipeline catch exceptions using headless execution spies.
 */

const createGoogleAuthController = require("../../../controllers/googleAuth.controller");

describe("Google Authentication Controller Unit Tests", () => {
  let mockGoogleAuthService;
  let mockCookieUtils;
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockGoogleAuthService = {
      googleAuthUser: jest.fn(),
    };

    mockCookieUtils = {
      setAuthCookies: jest.fn(),
    };

    controller = createGoogleAuthController(
      mockGoogleAuthService,
      mockCookieUtils,
    );

    mockReq = {
      body: {
        credential: "mock_raw_google_jwt_string",
        roles: ["mentee"],
        termsAccepted: true,
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return 200 and serialize profile keys when supplied verified Google identity tokens", async () => {
    const mockServiceResponse = {
      accessToken: "minted_access_jwt",
      refreshToken: "minted_refresh_jwt",
      user: { _id: "usr_google_88", name: "Alex", roles: ["mentee"] },
      isNewUser: true,
    };
    mockGoogleAuthService.googleAuthUser.mockResolvedValue(mockServiceResponse);

    await controller.googleAuth(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockGoogleAuthService.googleAuthUser).toHaveBeenCalledWith({
      credential: "mock_raw_google_jwt_string",
      roles: ["mentee"],
      termsAccepted: true,
    });
    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(
      mockRes,
      "minted_refresh_jwt",
      "mentee",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Google login successful",
      user: mockServiceResponse.user,
      accessToken: "minted_access_jwt",
      isNewUser: true,
    });
  });

  test("should route unmapped execution exceptions directly to next() for global handling", async () => {
    const mockException = new Error(
      "Google identity verification failed: Token expired",
    );
    mockGoogleAuthService.googleAuthUser.mockRejectedValue(mockException);

    await controller.googleAuth(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockException);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
