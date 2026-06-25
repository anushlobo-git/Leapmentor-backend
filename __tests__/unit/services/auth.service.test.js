/**
 * @fileoverview User Authentication Service Unit Tests
 * @description Validates user onboarding verification checks, identity clashes,
 * credential matching, and active status gates without spawning network connections.
 */

const createAuthService = require("../../../services/auth.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/user.mapper", () => ({
  toUserDTO: jest.fn((user) => ({ DTO: true, ...user })),
}));

describe("User Authentication Service Unit Tests", () => {
  let mockUserRepo, mockWalletService, mockAuthUtils, mockBcrypt, service;

  beforeEach(() => {
    mockUserRepo = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
      findUserByEmailWithPassword: jest.fn(),
    };
    mockWalletService = {
      createWalletsForRoles: jest.fn(),
    };
    mockAuthUtils = {
      validateRoles: jest.fn(),
      signAccessToken: jest.fn().mockReturnValue("mock_access_token"),
      signRefreshToken: jest.fn().mockReturnValue("mock_refresh_token"),
    };
    mockBcrypt = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    service = createAuthService(
      mockUserRepo,
      mockWalletService,
      mockAuthUtils,
      mockBcrypt,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser Processing Pipeline", () => {
    test("should execute successfully and issue session tokens for unique registration parameters", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });
      mockUserRepo.findUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("cryptographic_hashed_password_string");

      const mockCreatedDoc = {
        _id: "new_user_id_101",
        name: "John Doe",
        email: "john@test.com",
      };
      mockUserRepo.createUser.mockResolvedValue(mockCreatedDoc);

      const result = await service.registerUser({
        name: "John Doe",
        email: "john@test.com",
        password: "securepassword",
        roles: ["mentee"],
      });

      expect(mockAuthUtils.validateRoles).toHaveBeenCalledWith(["mentee"]);
      expect(mockBcrypt.hash).toHaveBeenCalledWith("securepassword", 10);
      expect(mockUserRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "cryptographic_hashed_password_string",
        }),
      );
      expect(mockWalletService.createWalletsForRoles).toHaveBeenCalledWith(
        "new_user_id_101",
        ["mentee"],
      );
      expect(result.accessToken).toBe("mock_access_token");
      expect(result.isNewUser).toBe(true);
    });

    test("should throw a 400 bad request error if role verification arrays return as invalid", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: false,
        message: "Invalid role. Use mentor and/or mentee.",
      });

      await expect(
        service.registerUser({ roles: ["invalid_role"] }),
      ).rejects.toThrow(
        new AppError("Invalid role. Use mentor and/or mentee.", 400),
      );
    });

    test("should throw a 409 identity conflict error if an email address already exists in the system", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });
      mockUserRepo.findUserByEmail.mockResolvedValue({
        _id: "existing_user_id",
      });

      await expect(
        service.registerUser({ email: "clash@test.com", roles: ["mentee"] }),
      ).rejects.toThrow(
        new AppError("An account with this email already exists.", 409),
      );
    });
  });

  describe("loginUser Verification Pipeline", () => {
    test("should approve session creations when credentials balance against the data store", async () => {
      const mockUserWithPass = {
        _id: "uid_44",
        password: "stored_hashed_value",
        isEmailVerified: true,
      };
      mockUserRepo.findUserByEmailWithPassword.mockResolvedValue(
        mockUserWithPass,
      );
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.loginUser({
        email: "login@test.com",
        password: "mypassword",
      });

      expect(mockUserRepo.findUserByEmailWithPassword).toHaveBeenCalledWith(
        "login@test.com",
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "mypassword",
        "stored_hashed_value",
      );
      expect(result.accessToken).toBe("mock_access_token");
    });

    test("should throw a 401 Unauthorized status if the target email lookup matches an empty registry pointer", async () => {
      mockUserRepo.findUserByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.loginUser({ email: "ghost@test.com", password: "any" }),
      ).rejects.toThrow(new AppError("Invalid email or password.", 401));
    });

    test("should throw a 401 Unauthorized status if the password payload comparisons fail", async () => {
      mockUserRepo.findUserByEmailWithPassword.mockResolvedValue({
        password: "hash",
      });
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        service.loginUser({
          email: "test@test.com",
          password: "wrong_password",
        }),
      ).rejects.toThrow(new AppError("Invalid email or password.", 401));
    });

    test("should throw a 403 Forbidden status if an account hasn't fulfilled email verification gates", async () => {
      mockUserRepo.findUserByEmailWithPassword.mockResolvedValue({
        password: "hash",
        isEmailVerified: false,
      });
      mockBcrypt.compare.mockResolvedValue(true);

      await expect(
        service.loginUser({
          email: "unverified@test.com",
          password: "password",
        }),
      ).rejects.toThrow(
        new AppError("Please verify your email address to log in.", 403),
      );
    });
  });
});
