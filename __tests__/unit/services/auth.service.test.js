/**
 * @fileoverview User Authentication Service Unit Tests
 * @description Validates user onboarding verification checks, identity clashes,
 * credential matching, and active status gates without spawning network connections.
 */

const createAuthService = require("../../../services/auth.service");
const AppError = require("../../../utils/AppError");

// toUserDTO is imported directly inside the service, so jest.mock works here
jest.mock("../../../mappers/user.mapper", () => ({
  toUserDTO: jest.fn((user) => ({ DTO: true, ...user })),
}));

describe("User Authentication Service Unit Tests", () => {
  let mockUserRepository;
  let mockWalletService;
  let mockAuthUtils;
  let mockBcrypt;
  let service;

  beforeEach(() => {
    mockUserRepository = {
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

    // ✅ Correct instantiation — matches the destructured signature
    service = createAuthService({
      userRepository: mockUserRepository,
      walletService: mockWalletService,
      authUtils: mockAuthUtils,
      bcrypt: mockBcrypt,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── registerUser ────────────────────────────────────────────────────────
  describe("registerUser Processing Pipeline", () => {
    test("should execute successfully and issue session tokens for unique registration parameters", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });
      mockUserRepository.findUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("cryptographic_hashed_password_string");

      const mockCreatedDoc = {
        _id: "new_user_id_101",
        name: "John Doe",
        email: "john@test.com",
      };
      mockUserRepository.createUser.mockResolvedValue(mockCreatedDoc);

      const result = await service.registerUser({
        name: "John Doe",
        email: "john@test.com",
        password: "securepassword",
        roles: ["mentee"],
      });

      expect(mockAuthUtils.validateRoles).toHaveBeenCalledWith(["mentee"]);
      expect(mockBcrypt.hash).toHaveBeenCalledWith("securepassword", 10);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "cryptographic_hashed_password_string",
          email: "john@test.com",
          isEmailVerified: false,
          termsAccepted: true,
        }),
      );
      expect(mockWalletService.createWalletsForRoles).toHaveBeenCalledWith(
        "new_user_id_101",
        ["mentee"],
      );
      expect(result.accessToken).toBe("mock_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.isNewUser).toBe(true);
    });

    test("should throw 400 if role verification returns invalid", async () => {
      // Branch: if (!valid)
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: false,
        message: "Invalid role. Use mentor and/or mentee.",
      });

      await expect(
        service.registerUser({ roles: ["invalid_role"] }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid role. Use mentor and/or mentee.",
      });

      expect(mockUserRepository.findUserByEmail).not.toHaveBeenCalled();
    });

    test("should throw 409 if email already exists in the system", async () => {
      // Branch: if (existing)
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });
      mockUserRepository.findUserByEmail.mockResolvedValue({ _id: "existing" });

      await expect(
        service.registerUser({ email: "clash@test.com", roles: ["mentee"] }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "An account with this email already exists.",
      });

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });
  });

  // ── loginUser ───────────────────────────────────────────────────────────
  describe("loginUser Verification Pipeline", () => {
    test("should approve session when credentials match", async () => {
      const mockUserWithPass = {
        _id: "uid_44",
        password: "stored_hashed_value",
        isEmailVerified: true,
      };
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue(
        mockUserWithPass,
      );
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.loginUser({
        email: "login@test.com",
        password: "mypassword",
      });

      expect(
        mockUserRepository.findUserByEmailWithPassword,
      ).toHaveBeenCalledWith("login@test.com");
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "mypassword",
        "stored_hashed_value",
      );
      expect(result.accessToken).toBe("mock_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.isNewUser).toBe(true);
    });

    test("should throw 401 if user is not found (null returned)", async () => {
      // Branch: if (!user?.password) — user is null
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.loginUser({ email: "ghost@test.com", password: "any" }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password.",
      });

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    test("should throw 401 if user exists but has no password field", async () => {
      // Branch: if (!user?.password) — user exists but password is undefined
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        _id: "uid_no_pass",
      });

      await expect(
        service.loginUser({ email: "nopass@test.com", password: "any" }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password.",
      });
    });

    test("should throw 401 if password comparison fails", async () => {
      // Branch: if (!isMatch)
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        password: "hash",
      });
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        service.loginUser({ email: "test@test.com", password: "wrong" }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid email or password.",
      });
    });

    test("should throw 403 if email is not verified", async () => {
      // Branch: if (!user.isEmailVerified)
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        password: "hash",
        isEmailVerified: false,
      });
      mockBcrypt.compare.mockResolvedValue(true);

      await expect(
        service.loginUser({ email: "unverified@test.com", password: "pass" }),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Please verify your email address to log in.",
      });
    });
  });
});
