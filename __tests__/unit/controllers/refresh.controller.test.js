/**
 * @fileoverview Session Token Refresh Controller Unit Tests
 * @description Validates boundary handling, token rotation signatures,
 * and fallback catch traps via Express next routing blocks.
 */

const createRefreshController = require("../../../controllers/refresh.controller");
const AppError = require("../../../utils/AppError");

describe("Session Token Refresh Controller Unit Tests", () => {
  let mockAuthUtils;
  let mockJwt;
  let mockConfig;
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

  // Yields execution context down the Node event loop until catchAsync microtasks drain
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockAuthUtils = {
      signAccessToken: jest.fn(),
    };

    mockJwt = {
      verify: jest.fn(),
    };

    mockConfig = {
      jwtRefreshSecret: "mock_env_refresh_secret_key",
    };

    controller = createRefreshController(mockAuthUtils, mockJwt, mockConfig);

    mockReq = {
      cookies: { refreshToken: "valid_refresh_token_cookie_string" },
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

  test("should issue a fresh short-term access token when supplied a valid refresh cookie", async () => {
    mockJwt.verify.mockReturnValue({ id: "user_account_id_555" });
    mockAuthUtils.signAccessToken.mockReturnValue("newly_minted_access_jwt");

    await controller.refreshToken(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockJwt.verify).toHaveBeenCalledWith(
      "valid_refresh_token_cookie_string",
      "mock_env_refresh_secret_key",
    );
    expect(mockAuthUtils.signAccessToken).toHaveBeenCalledWith(
      "user_account_id_555",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      accessToken: "newly_minted_access_jwt",
    });
  });

  test("should forward a 401 Unauthorized error to next() if the refreshToken cookie is missing", async () => {
    mockReq.cookies = {};

    await controller.refreshToken(mockReq, mockRes, mockNext);
    await flushPromises();

    // Verify catchAsync caught the error and forwarded it to the global error handler
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const thrownError = mockNext.mock.calls[0][0];
    expect(thrownError.message).toBe(
      "Refresh token parameter missing from secure payload contexts.",
    );
    expect(thrownError.statusCode).toBe(401);
  });

  test("should forward a 403 Forbidden error to next() if the token verification crashes", async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error("JsonWebTokenError: signature mismatch");
    });

    await controller.refreshToken(mockReq, mockRes, mockNext);
    await flushPromises();

    // Verify catchAsync caught the error and forwarded it to the global error handler
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const thrownError = mockNext.mock.calls[0][0];
    expect(thrownError.message).toBe(
      "Invalid or expired session refresh token reference.",
    );
    expect(thrownError.statusCode).toBe(403);
  });
});
