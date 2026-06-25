/**
 * @fileoverview Google Authentication Service Unit Tests
 * @description Validates ID token verification gates, user provisioning fallbacks,
 * signature matching, and edge case exceptions completely offline.
 */

const createGoogleAuthService = require("../../../services/googleAuth.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/user.mapper", () => ({
  toUserDTO: jest.fn((user) => ({ DTO: true, ...user })),
}));

describe("Google Authentication Service Unit Tests", () => {
  let mockUserRepo,
    mockOauthRepo,
    mockWalletService,
    mockAuthUtils,
    mockJwt,
    mockConfig,
    mockLogger,
    service;

  beforeEach(() => {
    mockUserRepo = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    mockOauthRepo = {
      findOAuthAccount: jest.fn(),
      createOAuthAccount: jest.fn(),
    };
    mockWalletService = {
      createWalletsForRoles: jest.fn(),
    };
    mockAuthUtils = {
      googleClient: {
        verifyIdToken: jest.fn(),
      },
      validateRoles: jest.fn(),
      signAccessToken: jest.fn().mockReturnValue("mock_access_jwt"),
      signRefreshToken: jest.fn().mockReturnValue("mock_refresh_jwt"),
    };
    mockJwt = {
      decode: jest.fn().mockReturnValue({ aud: "decoded_mock_client_id" }),
    };
    mockConfig = {
      googleClientId: "real_google_client_id_string",
    };
    mockLogger = {
      info: jest.fn(),
    };

    service = createGoogleAuthService(
      mockUserRepo,
      mockOauthRepo,
      mockWalletService,
      mockAuthUtils,
      mockJwt,
      mockConfig,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should authenticate an existing user cleanly without duplicating profile fields", async () => {
    const mockTicket = {
      getPayload: jest.fn().mockReturnValue({
        email: "existing@test.com",
        name: "John Google",
        sub: "google_unique_sub_123",
        email_verified: true,
      }),
    };
    mockAuthUtils.googleClient.verifyIdToken.mockResolvedValue(mockTicket);

    const mockUserInstance = {
      _id: "user_uuid_555",
      email: "existing@test.com",
      roles: ["mentee"],
    };
    mockUserRepo.findUserByEmail.mockResolvedValue(mockUserInstance);
    mockOauthRepo.findOAuthAccount.mockResolvedValue({ _id: "oauth_link_id" });

    const result = await service.googleAuthUser({
      credential: "mock_raw_jwt_credential",
    });

    expect(mockAuthUtils.googleClient.verifyIdToken).toHaveBeenCalled();
    expect(mockUserRepo.createUser).not.toHaveBeenCalled();
    expect(mockOauthRepo.createOAuthAccount).not.toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: "mock_access_jwt",
      refreshToken: "mock_refresh_jwt",
      user: expect.objectContaining({ DTO: true, _id: "user_uuid_555" }),
      isNewUser: false,
    });
  });

  test("should trigger onboarding and wallet creation pipelines for a verified first-time sign-up", async () => {
    const mockTicket = {
      getPayload: jest.fn().mockReturnValue({
        email: "newuser@test.com",
        name: "Newbie",
        sub: "google_sub_999",
        email_verified: true,
      }),
    };
    mockAuthUtils.googleClient.verifyIdToken.mockResolvedValue(mockTicket);
    mockUserRepo.findUserByEmail.mockResolvedValue(null);
    mockAuthUtils.validateRoles.mockReturnValue({
      valid: true,
      uniqueRoles: ["mentee"],
    });
    mockOauthRepo.findOAuthAccount.mockResolvedValue(null);

    const mockCreatedUser = { _id: "brand_new_id", email: "newuser@test.com" };
    mockUserRepo.createUser.mockResolvedValue(mockCreatedUser);

    const result = await service.googleAuthUser({
      credential: "mock_raw_jwt_credential",
      roles: ["mentee"],
      termsAccepted: true,
    });

    expect(mockUserRepo.createUser).toHaveBeenCalled();
    expect(mockWalletService.createWalletsForRoles).toHaveBeenCalledWith(
      "brand_new_id",
      ["mentee"],
    );
    expect(mockOauthRepo.createOAuthAccount).toHaveBeenCalledWith({
      user: "brand_new_id",
      provider: "google",
      providerId: "google_sub_999",
    });
    expect(result.isNewUser).toBe(true);
  });

  test("should throw a 400 Bad Request error if the raw credential parameter argument is omitted", async () => {
    await expect(service.googleAuthUser({ credential: null })).rejects.toThrow(
      new AppError("Missing Google credential", 400),
    );
  });

  test("should throw a 500 error if system environments are missing structural Client Identification keys", async () => {
    mockConfig.googleClientId = undefined;
    await expect(service.googleAuthUser({ credential: "jwt" })).rejects.toThrow(
      new AppError(
        "GOOGLE_CLIENT_ID is undefined in system configuration environments",
        500,
      ),
    );
  });

  test("should capture credential translation failures and return a 401 Unauthorized signature exception", async () => {
    mockAuthUtils.googleClient.verifyIdToken.mockRejectedValue(
      new Error("Token expired"),
    );

    await expect(
      service.googleAuthUser({ credential: "bad_jwt" }),
    ).rejects.toThrow(
      new AppError("Google identity verification failed: Token expired", 401),
    );
  });

  test("should reject signup requests with a 400 error if legal consent checkboxes remain unchecked", async () => {
    const mockTicket = {
      getPayload: jest
        .fn()
        .mockReturnValue({ email: "test@test.com", sub: "123" }),
    };
    mockAuthUtils.googleClient.verifyIdToken.mockResolvedValue(mockTicket);
    mockUserRepo.findUserByEmail.mockResolvedValue(null);

    await expect(
      service.googleAuthUser({ credential: "jwt", termsAccepted: false }),
    ).rejects.toThrow(new AppError("TERMS_NOT_ACCEPTED", 400));
  });
});
