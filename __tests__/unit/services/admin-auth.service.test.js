/**
 * @fileoverview Admin Authentication Service Unit Tests
 * @description Validates account matching constraints, state locks, password
 * verification gates, and dynamic token issuance with zero network connection.
 */

const createAdminAuthService = require("../../../services/admin-auth.service");
const AppError = require("../../../utils/AppError");

describe("AdminAuth Service", () => {
  let mockAdminUserRepository;
  let mockJwt;
  let mockToAdminDTO;
  let authService;
  let mockAdminInstance;

  beforeEach(() => {
    // Setup a clean admin document instance with mock prototype methods
    mockAdminInstance = {
      _id: "admin123",
      email: "root@leapmentor.com",
      isActive: true,
      lastLoginAt: null,
      comparePassword: jest.fn(),
    };

    // Mock the repository
    mockAdminUserRepository = {
      findAdminByEmail: jest.fn(),
      saveAdmin: jest.fn(),
    };

    // Mock jwt directly — service receives it as a dependency
    mockJwt = {
      sign: jest.fn().mockReturnValue("mocked-jwt-token"),
    };

    // Mock the DTO mapper
    mockToAdminDTO = jest
      .fn()
      .mockImplementation((admin) => ({ DTO: true, email: admin.email }));

    // ✅ Correct instantiation — matches the destructured signature:
    // createAdminAuthService({ adminUserRepository, jwt, toAdminDTO })
    authService = createAdminAuthService({
      adminUserRepository: mockAdminUserRepository,
      jwt: mockJwt,
      toAdminDTO: mockToAdminDTO,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("adminLoginService", () => {
    test("should successfully verify active administrators, update login timestamps, and issue tokens", async () => {
      mockAdminUserRepository.findAdminByEmail.mockResolvedValue(
        mockAdminInstance,
      );
      mockAdminInstance.comparePassword.mockResolvedValue(true);
      mockAdminUserRepository.saveAdmin.mockResolvedValue(mockAdminInstance);

      const result = await authService.adminLoginService({
        email: "root@leapmentor.com",
        password: "securePassword123",
      });

      // Repository lookup
      expect(mockAdminUserRepository.findAdminByEmail).toHaveBeenCalledWith(
        "root@leapmentor.com",
      );

      // Password comparison
      expect(mockAdminInstance.comparePassword).toHaveBeenCalledWith(
        "securePassword123",
      );

      // Timestamp updated
      expect(mockAdminInstance.lastLoginAt).toBeInstanceOf(Date);

      // Admin saved after login
      expect(mockAdminUserRepository.saveAdmin).toHaveBeenCalledWith(
        mockAdminInstance,
      );

      // JWT signed twice — once for access token (15m), once for refresh token (7d)
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        1,
        {
          id: "admin123",
          role: "admin",
          type: "access",
          tokenVersion: undefined,
        },
        expect.anything(),
        { expiresIn: "15m" },
      );
      expect(mockJwt.sign).toHaveBeenNthCalledWith(
        2,
        {
          id: "admin123",
          role: "admin",
          type: "refresh",
          tokenVersion: undefined,
        },
        expect.anything(),
        { expiresIn: "7d" },
      );

      // Return shape includes both tokens
      expect(result).toEqual({
        accessToken: "mocked-jwt-token",
        refreshToken: "mocked-jwt-token",
        admin: { DTO: true, email: "root@leapmentor.com" },
      });
    });

    test("should throw an unauthorized error (401) if the target email address is not found", async () => {
      mockAdminUserRepository.findAdminByEmail.mockResolvedValue(null);

      await expect(
        authService.adminLoginService({
          email: "missing@test.com",
          password: "any",
        }),
      ).rejects.toThrow(AppError);

      await expect(
        authService.adminLoginService({
          email: "missing@test.com",
          password: "any",
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid credentials.",
      });

      // Password check must never be reached when admin is not found
      expect(mockAdminInstance.comparePassword).not.toHaveBeenCalled();
    });

    test("should throw a forbidden error (403) if the administrator profile state is flagged deactivated", async () => {
      mockAdminInstance.isActive = false;
      mockAdminUserRepository.findAdminByEmail.mockResolvedValue(
        mockAdminInstance,
      );

      await expect(
        authService.adminLoginService({
          email: "root@leapmentor.com",
          password: "any",
        }),
      ).rejects.toThrow(AppError);

      await expect(
        authService.adminLoginService({
          email: "root@leapmentor.com",
          password: "any",
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Admin account is deactivated.",
      });

      // Password check must never be reached when account is deactivated
      expect(mockAdminInstance.comparePassword).not.toHaveBeenCalled();
    });

    test("should throw an unauthorized error (401) if the decrypted password evaluation fails", async () => {
      mockAdminUserRepository.findAdminByEmail.mockResolvedValue(
        mockAdminInstance,
      );
      mockAdminInstance.comparePassword.mockResolvedValue(false);

      await expect(
        authService.adminLoginService({
          email: "root@leapmentor.com",
          password: "wrongPassword",
        }),
      ).rejects.toThrow(AppError);

      await expect(
        authService.adminLoginService({
          email: "root@leapmentor.com",
          password: "wrongPassword",
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid credentials.",
      });

      // Admin must never be saved when password is wrong
      expect(mockAdminUserRepository.saveAdmin).not.toHaveBeenCalled();
    });
  });

  describe("refreshAdminTokenService", () => {
    beforeEach(() => {
      // Add new mock methods for refresh
      mockAdminUserRepository.findAdminByIdFull = jest.fn();
      mockAdminUserRepository.incrementTokenVersion = jest.fn();
      mockJwt.verify = jest.fn();
    });

    test("should issue fresh access and refresh tokens when presented with a valid refresh token", async () => {
      const validToken = "valid-refresh-token-xyz";
      const decodedPayload = {
        id: "admin123",
        role: "admin",
        type: "refresh",
        tokenVersion: 0,
      };
      mockJwt.verify.mockReturnValue(decodedPayload);
      mockAdminUserRepository.findAdminByIdFull.mockResolvedValue({
        ...mockAdminInstance,
        tokenVersion: 0,
      });

      const result = await authService.refreshAdminTokenService(validToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        expect.anything(),
      );
      expect(mockAdminUserRepository.findAdminByIdFull).toHaveBeenCalledWith(
        "admin123",
      );
      expect(result).toEqual({
        accessToken: "mocked-jwt-token",
        refreshToken: "mocked-jwt-token",
      });
    });

    test("should throw unauthorized error (401) when refresh token is null or empty", async () => {
      await expect(authService.refreshAdminTokenService(null)).rejects.toThrow(
        AppError,
      );

      await expect(
        authService.refreshAdminTokenService(null),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "No refresh token provided.",
      });

      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    test("should throw unauthorized error (401) when token verification fails", async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(
        authService.refreshAdminTokenService("invalid-token"),
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshAdminTokenService("invalid-token"),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid or expired refresh token.",
      });
    });

    test("should throw forbidden error (403) if token role is not admin", async () => {
      const invalidToken = "not-admin-token";
      mockJwt.verify.mockReturnValue({
        id: "user123",
        role: "mentee",
        type: "refresh",
        tokenVersion: 0,
      });

      await expect(
        authService.refreshAdminTokenService(invalidToken),
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshAdminTokenService(invalidToken),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Invalid refresh token.",
      });
    });

    test("should throw forbidden error (403) if token type is not refresh", async () => {
      const invalidToken = "access-token-not-refresh";
      mockJwt.verify.mockReturnValue({
        id: "admin123",
        role: "admin",
        type: "access",
        tokenVersion: 0,
      });

      await expect(
        authService.refreshAdminTokenService(invalidToken),
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshAdminTokenService(invalidToken),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Invalid refresh token.",
      });
    });

    test("should throw unauthorized error (401) when admin is not found in database", async () => {
      const validToken = "valid-refresh-token";
      mockJwt.verify.mockReturnValue({
        id: "admin-nonexistent",
        role: "admin",
        type: "refresh",
        tokenVersion: 0,
      });
      mockAdminUserRepository.findAdminByIdFull.mockResolvedValue(null);

      await expect(
        authService.refreshAdminTokenService(validToken),
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshAdminTokenService(validToken),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Admin not found.",
      });
    });

    test("should throw forbidden error (403) when admin account is deactivated", async () => {
      const validToken = "valid-refresh-token";
      mockJwt.verify.mockReturnValue({
        id: "admin123",
        role: "admin",
        type: "refresh",
        tokenVersion: 0,
      });
      mockAdminUserRepository.findAdminByIdFull.mockResolvedValue({
        ...mockAdminInstance,
        isActive: false,
        tokenVersion: 0,
      });

      await expect(
        authService.refreshAdminTokenService(validToken),
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshAdminTokenService(validToken),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Admin account is deactivated.",
      });
    });

    test("should throw unauthorized error (401) when tokenVersion does not match (session revoked)", async () => {
      const validToken = "valid-refresh-token";
      mockJwt.verify.mockReturnValue({
        id: "admin123",
        role: "admin",
        type: "refresh",
        tokenVersion: 0,
      });
      mockAdminUserRepository.findAdminByIdFull.mockResolvedValue({
        ...mockAdminInstance,
        isActive: true,
        tokenVersion: 1, // Bumped after logout
      });

      await expect(
        authService.refreshAdminTokenService(validToken),
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshAdminTokenService(validToken),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Session has been revoked. Please log in again.",
      });
    });
  });

  describe("adminLogoutService", () => {
    beforeEach(() => {
      mockAdminUserRepository.incrementTokenVersion = jest.fn();
      mockJwt.verify = jest.fn();
    });

    test("should increment tokenVersion to revoke all outstanding tokens", async () => {
      const refreshToken = "valid-refresh-token-to-logout";
      mockJwt.verify.mockReturnValue({
        id: "admin123",
      });

      await authService.adminLogoutService(refreshToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        refreshToken,
        expect.anything(),
      );
      expect(
        mockAdminUserRepository.incrementTokenVersion,
      ).toHaveBeenCalledWith("admin123");
    });

    test("should silently exit if no refresh token is provided", async () => {
      await authService.adminLogoutService(null);

      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(
        mockAdminUserRepository.incrementTokenVersion,
      ).not.toHaveBeenCalled();
    });

    test("should silently catch token verification errors without throwing", async () => {
      const invalidToken = "expired-or-invalid-token";
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Token verification failed");
      });

      // Should not throw
      await expect(
        authService.adminLogoutService(invalidToken),
      ).resolves.toBeUndefined();

      expect(
        mockAdminUserRepository.incrementTokenVersion,
      ).not.toHaveBeenCalled();
    });
  });
});
