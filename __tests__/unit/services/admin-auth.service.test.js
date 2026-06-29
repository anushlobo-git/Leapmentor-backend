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

      // JWT signed with correct payload and options
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: "admin123", role: "admin" },
        expect.anything(), // env.jwtSecret resolved at runtime
        { expiresIn: "7d" },
      );

      // Return shape
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
});
