/**
 * @fileoverview Session Token Refresh Controller Unit Tests
 * @description Validates boundary handling, token rotation signatures,
 * and fallback catch traps via Express next routing blocks.
 */

const createRefreshController = require("../../../controllers/refresh.controller");
const AppError = require("../../../utils/AppError");
const { successEnvelope } = require("../../helpers/apiResponse");
const { toUserDTO } = require("../../../mappers/user.mapper");

describe("Session Token Refresh Controller Unit Tests", () => {
  let mockAuthUtils;
  let mockJwt;
  let mockConfig;
  let mockUserRepository;
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

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

    // Pre-existing gap fixed: the controller reads `userRepository.findUserById`
    // before it can issue a new access token, so this dependency has to be
    // mocked too — omitting it (as the previous version of this test did)
    // meant the "success" test never actually reached signAccessToken at all.
    mockUserRepository = {
      findUserById: jest.fn(),
    };

    controller = createRefreshController({
      authUtils: mockAuthUtils,
      jwt: mockJwt,
      config: mockConfig,
      userRepository: mockUserRepository,
    });

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
    const mockUser = {
      _id: "user_account_id_555",
      name: "Test User",
      email: "test@example.com",
      roles: ["mentee"],
    };
    mockUserRepository.findUserById.mockResolvedValue(mockUser);

    await controller.refreshToken(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockJwt.verify).toHaveBeenCalledWith(
      "valid_refresh_token_cookie_string",
      "mock_env_refresh_secret_key",
    );
    expect(mockUserRepository.findUserById).toHaveBeenCalledWith(
      "user_account_id_555",
    );
    expect(mockAuthUtils.signAccessToken).toHaveBeenCalledWith(
      "user_account_id_555",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          accessToken: "newly_minted_access_jwt",
          user: toUserDTO(mockUser),
        },
        "Access token refreshed",
      ),
    );
  });

  test("should forward a 401 Unauthorized error to next() if the refreshToken cookie is missing", async () => {
    mockReq.cookies = {};

    await controller.refreshToken(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const thrownError = mockNext.mock.calls[0][0];
    expect(thrownError.message).toBe(
      "Refresh token parameter missing from secure payload contexts.",
    );
    expect(thrownError.statusCode).toBe(401);
  });

  test("should forward a 401 Unauthorized error to next() if req.cookies is undefined", async () => {
    mockReq.cookies = undefined;

    await controller.refreshToken(mockReq, mockRes, mockNext);
    await flushPromises();

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

    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const thrownError = mockNext.mock.calls[0][0];
    expect(thrownError.message).toBe(
      "Invalid or expired session refresh token reference.",
    );
    expect(thrownError.statusCode).toBe(403);
  });
});
