/**
 * @fileoverview User Login Controller Unit Tests
 * @description Validates request data extraction, payload mapping, and boundary
 * error routing without initiating real network operations.
 */

const createLoginController = require("../../../controllers/login.controller");

describe("User Login Controller Unit Tests", () => {
  let mockAuthService;
  let mockCookieUtils;
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockAuthService = {
      loginUser: jest.fn(),
    };

    mockCookieUtils = {
      setAuthCookies: jest.fn(),
    };

    controller = createLoginController(mockAuthService, mockCookieUtils);

    mockReq = {
      body: {
        email: "testuser@test.com",
        password: "securepassword123",
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

  test("should return a 200 status code and issue cookies given valid credentials", async () => {
    const mockServiceResponse = {
      accessToken: "mock_access_jwt_token",
      refreshToken: "mock_refresh_jwt_token",
      user: {
        _id: "usr_abc_123",
        email: "testuser@test.com",
        roles: ["mentor"],
      },
    };
    mockAuthService.loginUser.mockResolvedValue(mockServiceResponse);

    await controller.login(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockAuthService.loginUser).toHaveBeenCalledWith(mockReq.body);
    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(
      mockRes,
      "mock_refresh_jwt_token",
      "mentor",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Login successful",
      user: mockServiceResponse.user,
      accessToken: "mock_access_jwt_token",
    });
  });

  test("should delegate service processing failures directly to next() for centralized catching", async () => {
    const mockException = new Error("Invalid email or password.");
    mockAuthService.loginUser.mockRejectedValue(mockException);

    await controller.login(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockException);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
