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
      addRoleToUser: jest.fn(),
    };
    mockWalletService = {
      createWalletsForRoles: jest.fn(),
      createWalletForRole: jest.fn(),
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
    test("outcome 'created': brand-new email is registered and issued tokens", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue(null);
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
      expect(result.outcome).toBe("created");
      expect(result.accessToken).toBe("mock_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.isNewUser).toBe(true);
      expect(result.loggedIn).toBe(false);
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

      expect(
        mockUserRepository.findUserByEmailWithPassword,
      ).not.toHaveBeenCalled();
    });

    test("outcome 'login_required': existing email but the password does NOT match — account untouched", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentor"],
      });
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        _id: "existing",
        password: "stored_hash",
        roles: ["mentee"],
      });
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await service.registerUser({
        email: "clash@test.com",
        password: "wrong-password",
        roles: ["mentor"],
      });

      expect(result.outcome).toBe("login_required");
      expect(result.loggedIn).toBe(false);
      // Nothing about the account changes when ownership isn't proven.
      expect(mockUserRepository.addRoleToUser).not.toHaveBeenCalled();
      expect(mockWalletService.createWalletForRole).not.toHaveBeenCalled();
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });

    test("outcome 'already_registered' + unverified: owner already holds the role, no session (routed to verify)", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        _id: "existing",
        password: "stored_hash",
        roles: ["mentee"],
        isEmailVerified: false,
      });
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.registerUser({
        email: "owner@test.com",
        password: "correct-password",
        roles: ["mentee"],
      });

      expect(result.outcome).toBe("already_registered");
      expect(result.loggedIn).toBe(false);
      expect(result.accessToken).toBeUndefined();
      expect(mockUserRepository.addRoleToUser).not.toHaveBeenCalled();
      expect(mockWalletService.createWalletForRole).not.toHaveBeenCalled();
    });

    test("outcome 'already_registered' + verified: owner already holds the role → auto-logs-in", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentee"],
      });
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        _id: "existing",
        password: "stored_hash",
        roles: ["mentee"],
        isEmailVerified: true,
      });
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.registerUser({
        email: "owner@test.com",
        password: "correct-password",
        roles: ["mentee"],
      });

      expect(result.outcome).toBe("already_registered");
      expect(result.loggedIn).toBe(true);
      expect(result.accessToken).toBe("mock_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
      // Nothing to create — the role already exists.
      expect(mockUserRepository.addRoleToUser).not.toHaveBeenCalled();
      expect(mockWalletService.createWalletForRole).not.toHaveBeenCalled();
    });

    test("outcome 'role_added' + verified: adds the role, provisions its wallet, and auto-logs-in", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentor"],
      });
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        _id: "existing",
        password: "stored_hash",
        roles: ["mentee"],
        isEmailVerified: true,
      });
      mockBcrypt.compare.mockResolvedValue(true);
      mockUserRepository.addRoleToUser.mockResolvedValue({
        _id: "existing",
        roles: ["mentee", "mentor"],
        isEmailVerified: true,
      });

      const result = await service.registerUser({
        email: "owner@test.com",
        password: "correct-password",
        roles: ["mentor"],
      });

      expect(mockUserRepository.addRoleToUser).toHaveBeenCalledWith(
        "existing",
        "mentor",
      );
      expect(mockWalletService.createWalletForRole).toHaveBeenCalledWith(
        "existing",
        "mentor",
      );
      expect(result.outcome).toBe("role_added");
      expect(result.loggedIn).toBe(true);
      expect(result.accessToken).toBe("mock_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
    });

    test("outcome 'role_added' + unverified: adds the role but issues NO session (routed to verify)", async () => {
      mockAuthUtils.validateRoles.mockReturnValue({
        valid: true,
        uniqueRoles: ["mentor"],
      });
      mockUserRepository.findUserByEmailWithPassword.mockResolvedValue({
        _id: "existing",
        password: "stored_hash",
        roles: ["mentee"],
        isEmailVerified: false,
      });
      mockBcrypt.compare.mockResolvedValue(true);
      mockUserRepository.addRoleToUser.mockResolvedValue({
        _id: "existing",
        roles: ["mentee", "mentor"],
        isEmailVerified: false,
      });

      const result = await service.registerUser({
        email: "owner@test.com",
        password: "correct-password",
        roles: ["mentor"],
      });

      expect(mockUserRepository.addRoleToUser).toHaveBeenCalledWith(
        "existing",
        "mentor",
      );
      expect(mockWalletService.createWalletForRole).toHaveBeenCalledWith(
        "existing",
        "mentor",
      );
      expect(result.outcome).toBe("role_added");
      expect(result.loggedIn).toBe(false);
      expect(result.accessToken).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
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

  describe("addAccountRole (RBAC self-service role addition)", () => {
    test("should add a new role to the caller's own account and provision a wallet for it", async () => {
      const currentUser = {
        _id: "user_1",
        roles: ["mentee"],
      };
      const updatedUser = { _id: "user_1", roles: ["mentee", "mentor"] };
      mockUserRepository.addRoleToUser.mockResolvedValue(updatedUser);

      const result = await service.addAccountRole(currentUser, "mentor");

      expect(mockUserRepository.addRoleToUser).toHaveBeenCalledWith(
        "user_1",
        "mentor",
      );
      expect(mockWalletService.createWalletForRole).toHaveBeenCalledWith(
        "user_1",
        "mentor",
      );
      expect(result).toMatchObject({ DTO: true, roles: ["mentee", "mentor"] });
    });

    test("should reject an unrecognized role name with a 400", async () => {
      const currentUser = { _id: "user_1", roles: ["mentee"] };

      await expect(
        service.addAccountRole(currentUser, "superadmin"),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(mockUserRepository.addRoleToUser).not.toHaveBeenCalled();
    });

    test("should reject with 409 if the account already holds the requested role", async () => {
      const currentUser = { _id: "user_1", roles: ["mentee", "mentor"] };

      await expect(
        service.addAccountRole(currentUser, "mentor"),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Your account already has the "mentor" role.',
      });

      expect(mockUserRepository.addRoleToUser).not.toHaveBeenCalled();
      expect(mockWalletService.createWalletForRole).not.toHaveBeenCalled();
    });

    test("should throw 404 if the account no longer exists at write time", async () => {
      const currentUser = { _id: "ghost_user", roles: ["mentee"] };
      mockUserRepository.addRoleToUser.mockResolvedValue(null);

      await expect(
        service.addAccountRole(currentUser, "mentor"),
      ).rejects.toMatchObject({ statusCode: 404 });

      // A vanished account should never trigger wallet provisioning.
      expect(mockWalletService.createWalletForRole).not.toHaveBeenCalled();
    });
  });
});
