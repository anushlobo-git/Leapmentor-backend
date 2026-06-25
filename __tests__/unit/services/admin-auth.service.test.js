/**
 * @fileoverview Admin Authentication Service Corporate Unit Tests
 * @description Validates account matching constraints, state locks, password
 * verification gates, and dynamic token issuance with zero network connection.
 */

const createAdminAuthService = require("../../../services/admin-auth.service");
const AppError = require("../../../utils/AppError");
const jwt = require("jsonwebtoken");

// Mock dependencies to guarantee absolute isolation
jest.mock("jsonwebtoken");
jest.mock("../../../mappers/admin.mapper", () => ({
  toAdminDTO: jest.fn((admin) => ({ DTO: true, email: admin.email })),
}));

describe("AdminAuth Service", () => {
  let mockAdminUserRepository;
  let authService;
  let mockAdminInstance;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key";

    // Setup a clean document instance wrapper with mock prototype methods
    mockAdminInstance = {
      _id: "admin123",
      email: "root@leapmentor.com",
      isActive: true,
      lastLoginAt: null,
      comparePassword: jest.fn(),
    };

    mockAdminUserRepository = {
      findAdminByEmail: jest.fn(),
      saveAdmin: jest.fn(),
    };

    authService = createAdminAuthService(mockAdminUserRepository);
    jwt.sign.mockReturnValue("mocked-jwt-token");
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
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

      expect(mockAdminUserRepository.findAdminByEmail).toHaveBeenCalledWith(
        "root@leapmentor.com",
      );
      expect(mockAdminInstance.comparePassword).toHaveBeenCalledWith(
        "securePassword123",
      );
      expect(mockAdminInstance.lastLoginAt).toBeInstanceOf(Date);
      expect(mockAdminUserRepository.saveAdmin).toHaveBeenCalledWith(
        mockAdminInstance,
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: "admin123", role: "admin" },
        "test-secret-key",
        { expiresIn: "7d" },
      );
      expect(result).toEqual({
        token: "mocked-jwt-token",
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

      try {
        await authService.adminLoginService({
          email: "missing@test.com",
          password: "any",
        });
      } catch (error) {
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe("Invalid credentials.");
      }
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

      try {
        await authService.adminLoginService({
          email: "root@leapmentor.com",
          password: "any",
        });
      } catch (error) {
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe("Admin account is deactivated.");
      }
      expect(mockAdminInstance.comparePassword).not.toHaveBeenCalled();
    });

    test("should throw an unauthorized error (401) if the decrypted password evaluation fails matches", async () => {
      mockAdminUserRepository.findAdminByEmail.mockResolvedValue(
        mockAdminInstance,
      );
      mockAdminInstance.comparePassword.mockResolvedValue(false); // Invalid password match

      await expect(
        authService.adminLoginService({
          email: "root@leapmentor.com",
          password: "wrongPassword",
        }),
      ).rejects.toThrow(AppError);

      try {
        await authService.adminLoginService({
          email: "root@leapmentor.com",
          password: "wrongPassword",
        });
      } catch (error) {
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe("Invalid credentials.");
      }
      expect(mockAdminUserRepository.saveAdmin).not.toHaveBeenCalled();
    });
  });
});
