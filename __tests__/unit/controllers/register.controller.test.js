/**
 * @fileoverview User Account Registration Controller Unit Tests
 * @description Validates client input mapping, response token delivery,
 * status codes, and exception cascading under isolated execution stubs.
 */

const createRegisterController = require("../../../controllers/register.controller");

describe("User Account Registration Controller Unit Tests", () => {
  let mockAuthService;
  let mockCookieUtils;
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

  // Flushes the microtask queue to allow async resolutions wrapped in catchAsync to resolve cleanly
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockAuthService = {
      registerUser: jest.fn(),
    };

    mockCookieUtils = {
      setAuthCookies: jest.fn(),
    };

    controller = createRegisterController(mockAuthService, mockCookieUtils);

    mockReq = {
      body: {
        name: "Jane Doe",
        email: "jane.doe@test.com",
        password: "password123456",
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

  test("should return a 201 status code and establish auth cookies upon valid payload registration", async () => {
    const mockServicePayload = {
      accessToken: "mocked_access_jwt_string",
      refreshToken: "mocked_refresh_jwt_string",
      user: { _id: "usr_reg_999", name: "Jane Doe", roles: ["mentee"] },
      isNewUser: true,
    };
    mockAuthService.registerUser.mockResolvedValue(mockServicePayload);

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockAuthService.registerUser).toHaveBeenCalledWith(mockReq.body);
    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(
      mockRes,
      "mocked_refresh_jwt_string",
      "mentee",
    );
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Registered successfully",
      user: mockServicePayload.user,
      isNewUser: true,
      accessToken: "mocked_access_jwt_string",
    });
  });

  test("should capture service exceptions and delegate them to next() for global catching middleware", async () => {
    const mockException = new Error(
      "An account with this email already exists.",
    );
    mockAuthService.registerUser.mockRejectedValue(mockException);

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockException);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
