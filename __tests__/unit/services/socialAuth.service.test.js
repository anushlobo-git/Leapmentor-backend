/**
 * @fileoverview Social Authentication Service Unit Tests
 * @description Validates complex multi-provider social routing pipelines, automated fallback registration roles,
 * terms consent exceptions, and token generation loops without live database requirements.
 */

const createSocialAuthService = require("../../../services/socialAuth.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/user.mapper", () => ({
  toUserDTO: jest.fn((user) => ({ DTO: true, ...user })),
}));

describe("Social Authentication Service Unit Tests", () => {
  let mockUserRepo,
    mockOauthRepo,
    mockWalletService,
    mockAuthUtils,
    mockLogger,
    service;

  beforeEach(() => {
    mockUserRepo = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    mockOauthRepo = {
      findOAuthAccountWithUser: jest.fn(),
      createOAuthAccount: jest.fn(),
    };
    mockWalletService = {
      createWalletsForRoles: jest.fn(),
    };
    mockAuthUtils = {
      signAccessToken: jest.fn().mockReturnValue("mock_access_jwt"),
      signRefreshToken: jest.fn().mockReturnValue("mock_refresh_jwt"),
      validateRoles: jest.fn(),
    };
    mockLogger = {
      info: jest.fn(),
    };

    service = createSocialAuthService(
      mockUserRepo,
      mockOauthRepo,
      mockWalletService,
      mockAuthUtils,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should authenticate instantly and bypass registration if an existing OAuth account map is found", async () => {
    const mockUser = {
      _id: "user_uuid_777",
      name: "Jane Doe",
      email: "jane@test.com",
    };
    mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue({
      user: mockUser,
    });

    const result = await service.socialAuthUser({
      provider: "linkedin",
      providerId: "lnk_id_abc",
    });

    expect(mockOauthRepo.findOAuthAccountWithUser).toHaveBeenCalledWith(
      "linkedin",
      "lnk_id_abc",
    );
    expect(mockAuthUtils.signAccessToken).toHaveBeenCalledWith("user_uuid_777");
    expect(mockUserRepo.createUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: "mock_access_jwt",
      refreshToken: "mock_refresh_jwt",
      user: expect.objectContaining({ DTO: true, _id: "user_uuid_777" }),
      isNewUser: false,
    });
  });

  test("should provision a brand new user and wallet matrices if the profile is unmapped and consents are verified", async () => {
    mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);
    mockUserRepo.findUserByEmail.mockResolvedValue(null);
    mockAuthUtils.validateRoles.mockReturnValue({
      valid: true,
      uniqueRoles: ["mentee"],
    });

    const mockCreatedUser = {
      _id: "new_user_999",
      name: "Alice",
      email: "alice@test.com",
    };
    mockUserRepo.createUser.mockResolvedValue(mockCreatedUser);

    const result = await service.socialAuthUser({
      provider: "apple",
      providerId: "apple_id_xyz",
      email: "alice@test.com",
      name: "Alice",
      roles: ["mentee"],
      termsAccepted: true,
    });

    expect(mockUserRepo.createUser).toHaveBeenCalled();
    expect(mockWalletService.createWalletsForRoles).toHaveBeenCalledWith(
      "new_user_999",
      ["mentee"],
    );
    expect(mockOauthRepo.createOAuthAccount).toHaveBeenCalledWith({
      user: "new_user_999",
      provider: "apple",
      providerId: "apple_id_xyz",
    });
    expect(result.isNewUser).toBe(true);
  });

  test("should throw a 400 Bad Request error if a client presents an invalid authentication provider type", async () => {
    await expect(
      service.socialAuthUser({ provider: "github", providerId: "git_id" }),
    ).rejects.toThrow(
      new AppError("Invalid authentication provider configuration", 400),
    );
  });

  test("should throw a TERMS_NOT_ACCEPTED 400 error when a new sign-up skips consent checkboxes", async () => {
    mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);
    mockUserRepo.findUserByEmail.mockResolvedValue(null);

    await expect(
      service.socialAuthUser({
        provider: "apple",
        providerId: "apple_id_111",
        email: "unconsented@test.com",
        termsAccepted: false,
      }),
    ).rejects.toThrow(new AppError("TERMS_NOT_ACCEPTED", 400));
  });
});
