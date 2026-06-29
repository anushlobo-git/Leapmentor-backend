/**
 * @fileoverview Social Authentication Service Unit Tests
 * @description Validates complex multi-provider social routing pipelines, automated fallback registration roles,
 * terms consent exceptions, account linking hooks, and token generation loops completely in-memory.
 */

const createSocialAuthService = require("../../../services/socialAuth.service");
const AppError = require("../../../utils/AppError");
const { toUserDTO } = require("../../../mappers/user.mapper"); // FIXED: Corrected relative path to match project root layout

// Mock the User DTO mapper cleanly
jest.mock("../../../mappers/user.mapper", () => ({
  toUserDTO: jest.fn((user) => ({ DTO: true, ...user })),
}));

describe("SocialAuthService Unit Tests", () => {
  let mockUserRepo;
  let mockOauthRepo;
  let mockWalletService;
  let mockAuthUtils;
  let mockLogger;
  let service;

  beforeEach(() => {
    // ── MOCK SYSTEM REPOSITORIES
    mockUserRepo = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    mockOauthRepo = {
      findOAuthAccountWithUser: jest.fn(),
      createOAuthAccount: jest.fn(),
    };

    // ── MOCK DEPENDENT SERVICES & UTILS
    mockWalletService = {
      createWalletsForRoles: jest.fn().mockResolvedValue(true),
    };

    mockAuthUtils = {
      signAccessToken: jest.fn().mockReturnValue("mock_access_jwt"),
      signRefreshToken: jest.fn().mockReturnValue("mock_refresh_jwt"),
      validateRoles: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
    };

    // CRITICAL FIX: Inject dependencies encapsulated inside a single configuration parameters object
    service = createSocialAuthService({
      userRepository: mockUserRepo,
      oauthAccountRepository: mockOauthRepo,
      walletService: mockWalletService,
      authUtils: mockAuthUtils,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── CORE GUARD CHANNELS & VALIDATIONS ──────────────────────────────────
  describe("Input Parameter Validation Guards", () => {
    test("should throw 400 AppError when the client presents an unlisted/unsupported provider type", async () => {
      await expect(
        service.socialAuthUser({
          provider: "github",
          providerId: "git_id_123",
        }),
      ).rejects.toThrow(
        new AppError("Invalid authentication provider configuration", 400),
      );
    });

    test("should throw 400 AppError when providerId parameter is completely missing", async () => {
      await expect(
        service.socialAuthUser({ provider: "linkedin", providerId: undefined }),
      ).rejects.toThrow(
        new AppError(
          "providerId is required for social mapping validation",
          400,
        ),
      );
    });

    test("should throw 400 AppError when existing mapping is missing and email parameter is absent", async () => {
      mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);

      await expect(
        service.socialAuthUser({
          provider: "apple",
          providerId: "apple_id_111",
          email: undefined,
        }),
      ).rejects.toThrow(
        new AppError("email is required to create or link an account", 400),
      );
    });
  });

  // ── PATH A: EXISTING OAUTH MAP FOUND ───────────────────────────────────
  describe("Existing OAuth Map Execution Pipeline", () => {
    test("should authenticate instantly and bypass registration workflows if an existing mapping is matched", async () => {
      const mockAssociatedUser = {
        _id: "user_uuid_777",
        name: "Jane Doe",
        email: "jane@test.com",
      };
      mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue({
        user: mockAssociatedUser,
      });

      const result = await service.socialAuthUser({
        provider: "linkedin",
        providerId: "lnk_id_abc",
      });

      expect(mockOauthRepo.findOAuthAccountWithUser).toHaveBeenCalledWith(
        "linkedin",
        "lnk_id_abc",
      );
      expect(mockAuthUtils.signAccessToken).toHaveBeenCalledWith(
        "user_uuid_777",
      );
      expect(mockAuthUtils.signRefreshToken).toHaveBeenCalledWith(
        "user_uuid_777",
      );
      expect(mockUserRepo.createUser).not.toHaveBeenCalled();
      expect(toUserDTO).toHaveBeenCalledWith(mockAssociatedUser);
      expect(result).toEqual({
        accessToken: "mock_access_jwt",
        refreshToken: "mock_refresh_jwt",
        user: expect.objectContaining({ DTO: true, _id: "user_uuid_777" }),
        isNewUser: false,
      });
    });
  });

  // ── PATH B: EXISTENT EMAIL / UNMAPPED OAUTH ───────────────────────────
  describe("Unmapped Federated Profile Linking Process", () => {
    test("should bind new federated records onto existing user profiles without re-creating user entities", async () => {
      mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);

      const mockPreexistingUser = {
        _id: "user_preexist_555",
        email: "preexist@test.com",
        roles: ["mentor"],
      };
      mockUserRepo.findUserByEmail.mockResolvedValue(mockPreexistingUser);

      const result = await service.socialAuthUser({
        provider: "apple",
        providerId: "apple_linked_999",
        email: "PREEXIST@test.com ",
      });

      expect(mockUserRepo.findUserByEmail).toHaveBeenCalledWith(
        "preexist@test.com",
      );
      expect(mockUserRepo.createUser).not.toHaveBeenCalled();
      expect(mockOauthRepo.createOAuthAccount).toHaveBeenCalledWith({
        user: "user_preexist_555",
        provider: "apple",
        providerId: "apple_linked_999",
      });
      expect(result.isNewUser).toBe(false);
      expect(result.accessToken).toBe("mock_access_jwt");
    });
  });

  // ── PATH C: BRAND NEW USER REGISTRATION ────────────────────────────────
  describe("New Profile Provisioning Pipelines", () => {
    test("should throw 400 AppError when a sign-up attempt skips mandatory terms agreement consent checkboxes", async () => {
      mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);
      mockUserRepo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.socialAuthUser({
          provider: "apple",
          providerId: "apple_id_888",
          email: "unconsented@test.com",
          termsAccepted: false,
        }),
      ).rejects.toThrow(new AppError("TERMS_NOT_ACCEPTED", 400));
    });

    test("should throw 400 AppError when custom verification engines mark requested roles as invalid", async () => {
      mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);
      mockUserRepo.findUserByEmail.mockResolvedValue(null);

      mockAuthUtils.validateRoles.mockReturnValue({
        valid: false,
        message: "Invalid cross-combination role structures selected",
        uniqueRoles: [],
      });

      await expect(
        service.socialAuthUser({
          provider: "apple",
          providerId: "apple_id_999",
          email: "valid@test.com",
          roles: ["mentor", "mentee"],
          termsAccepted: true,
        }),
      ).rejects.toThrow(
        new AppError("Invalid cross-combination role structures selected", 400),
      );
    });

    test("should fall back to default roles and generic names if registration strings are completely empty or un-arrayed", async () => {
      mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);
      mockUserRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });

      const mockCreatedUser = {
        _id: "generated_fallback_id",
        name: "User",
        email: "fallback@test.com",
      };
      mockUserRepo.createUser.mockResolvedValue(mockCreatedUser);

      const result = await service.socialAuthUser({
        provider: "linkedin",
        providerId: "lnk_blank_000",
        email: "fallback@test.com",
        name: "",
        roles: "invalid_not_an_array_type",
        termsAccepted: true,
      });

      expect(mockAuthUtils.validateRoles).toHaveBeenCalledWith(["mentee"]);
      expect(mockUserRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: "User", roles: ["mentee"] }),
      );
      expect(mockWalletService.createWalletsForRoles).toHaveBeenCalledWith(
        "generated_fallback_id",
        ["mentee"],
      );
      expect(result.isNewUser).toBe(true);
    });

    test("should provision user record profiles, clear asset wallets, and bind mapping connections on clear success parameters", async () => {
      mockOauthRepo.findOAuthAccountWithUser.mockResolvedValue(null);
      mockUserRepo.findUserByEmail.mockResolvedValue(null);
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentor"],
      });

      const mockCreatedUser = {
        _id: "new_mentor_uuid",
        name: "Bob",
        email: "bob@test.com",
      };
      mockUserRepo.createUser.mockResolvedValue(mockCreatedUser);

      const result = await service.socialAuthUser({
        provider: "apple",
        providerId: "apple_secure_id",
        email: "bob@test.com",
        name: "  Bob  ",
        roles: ["mentor", "invalid_ignored_role"],
        termsAccepted: true,
      });

      expect(mockUserRepo.createUser).toHaveBeenCalledWith({
        name: "Bob",
        email: "bob@test.com",
        roles: ["mentor"],
        isEmailVerified: true,
        termsAccepted: true,
        termsAcceptedAt: expect.any(Date),
      });
      expect(mockWalletService.createWalletsForRoles).toHaveBeenCalledWith(
        "new_mentor_uuid",
        ["mentor"],
      );
      expect(mockOauthRepo.createOAuthAccount).toHaveBeenCalledWith({
        user: "new_mentor_uuid",
        provider: "apple",
        providerId: "apple_secure_id",
      });
      expect(result.isNewUser).toBe(true);
    });
  });
});
