/**
 * @fileoverview Admin Settings Service Unit Tests
 * @description Full branch coverage for all five service methods.
 */

const createAdminSettingsService = require("../../../services/admin-settings.service");
const AppError = require("../../../utils/AppError");

describe("Admin Settings Service", () => {
  let mockAdminUserRepository;
  let mockUserRepository;
  let mockConnectRequestRepository;
  let mockCrypto;
  let service;

  beforeEach(() => {
    mockAdminUserRepository = {
      findAdminByIdLean: jest.fn(),
      findAdminByEmail: jest.fn(),
      createAdmin: jest.fn(),
      updateAdminById: jest.fn(),
    };
    mockUserRepository = { countAllUsers: jest.fn() };
    mockConnectRequestRepository = { countByStatus: jest.fn() };

    // Mock crypto — injected as a dependency
    mockCrypto = {
      randomBytes: jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue("abc123"),
      }),
    };

    // ✅ Correct instantiation — matches the destructured signature
    service = createAdminSettingsService({
      adminUserRepository: mockAdminUserRepository,
      userRepository: mockUserRepository,
      connectRequestRepository: mockConnectRequestRepository,
      crypto: mockCrypto,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getOverviewService ──────────────────────────────────────────────────
  describe("getOverviewService", () => {
    test("should return totalUsers and activeSessions from parallel queries", async () => {
      mockUserRepository.countAllUsers.mockResolvedValue(500);
      mockConnectRequestRepository.countByStatus.mockResolvedValue(24);

      const result = await service.getOverviewService();

      expect(mockConnectRequestRepository.countByStatus).toHaveBeenCalledWith(
        "ongoing",
      );
      expect(result).toEqual({ totalUsers: 500, activeSessions: 24 });
    });
  });

  // ── changeAdminPasswordService ──────────────────────────────────────────
  describe("changeAdminPasswordService", () => {
    test("should call updateAdminById with new password when both fields are provided", async () => {
      mockAdminUserRepository.updateAdminById.mockResolvedValue(undefined);

      await service.changeAdminPasswordService("adm1", {
        oldPassword: "OldPass1!",
        newPassword: "NewPass1!",
      });

      expect(mockAdminUserRepository.updateAdminById).toHaveBeenCalledWith(
        "adm1",
        { password: "NewPass1!" },
      );
    });

    test("should throw 400 if oldPassword is missing", async () => {
      await expect(
        service.changeAdminPasswordService("adm1", {
          newPassword: "NewPass1!",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Both current and proposed passwords are required parameters.",
      });
    });

    test("should throw 400 if newPassword is missing", async () => {
      await expect(
        service.changeAdminPasswordService("adm1", {
          oldPassword: "OldPass1!",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Both current and proposed passwords are required parameters.",
      });
    });
  });

  // ── addAdminService ─────────────────────────────────────────────────────
  describe("addAdminService", () => {
    test("should create and return a new admin with a temp password", async () => {
      mockAdminUserRepository.findAdminByEmail.mockResolvedValue(null);
      mockAdminUserRepository.createAdmin.mockResolvedValue({
        _id: "adm99",
        name: "New Admin",
        email: "newadmin@test.com",
      });

      const result = await service.addAdminService({
        name: "New Admin",
        email: "NewAdmin@Test.com",
      });

      expect(mockAdminUserRepository.findAdminByEmail).toHaveBeenCalledWith(
        "newadmin@test.com",
      );
      expect(mockAdminUserRepository.createAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Admin",
          email: "newadmin@test.com",
          isSuperAdmin: false,
          isActive: true,
        }),
      );
      expect(result.admin).toEqual({
        _id: "adm99",
        name: "New Admin",
        email: "newadmin@test.com",
      });
      expect(typeof result.tempPassword).toBe("string");
    });

    test("should throw 400 if name is blank", async () => {
      await expect(
        service.addAdminService({ name: "   ", email: "a@test.com" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Name and email are required fields.",
      });
    });

    test("should throw 400 if email is blank", async () => {
      await expect(
        service.addAdminService({ name: "Admin", email: "   " }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Name and email are required fields.",
      });
    });

    test("should throw 409 if email already exists", async () => {
      mockAdminUserRepository.findAdminByEmail.mockResolvedValue({
        _id: "existing",
      });

      await expect(
        service.addAdminService({ name: "Admin", email: "dupe@test.com" }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "An administrator account with this email already exists.",
      });

      expect(mockAdminUserRepository.createAdmin).not.toHaveBeenCalled();
    });
  });

  // ── getCommissionService ────────────────────────────────────────────────
  describe("getCommissionService", () => {
    test("should return admin commissionRate when it is set", async () => {
      mockAdminUserRepository.findAdminByIdLean.mockResolvedValue({
        commissionRate: 15,
      });

      const result = await service.getCommissionService("adm1");

      expect(result).toBe(15);
    });

    test("should return DEFAULT_COMMISSION_RATE (20) when admin is null", async () => {
      // Branch: admin?.commissionRate ?? DEFAULT_COMMISSION_RATE
      mockAdminUserRepository.findAdminByIdLean.mockResolvedValue(null);

      const result = await service.getCommissionService("adm1");

      expect(result).toBe(20);
    });
  });

  // ── updateCommissionService ─────────────────────────────────────────────
  describe("updateCommissionService", () => {
    test("should update and return the commission rate when valid", async () => {
      mockAdminUserRepository.updateAdminById.mockResolvedValue(undefined);

      const result = await service.updateCommissionService("adm1", "18.5");

      expect(mockAdminUserRepository.updateAdminById).toHaveBeenCalledWith(
        "adm1",
        { commissionRate: 18.5 },
      );
      expect(result).toBe(18.5);
    });

    test("should throw 400 if rate is not a number", async () => {
      // Branch: Number.isNaN(rate)
      await expect(
        service.updateCommissionService("adm1", "abc"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message:
          "Commission rate must be a valid percentage metrics number between 0 and 100.",
      });
    });

    test("should throw 400 if rate is below 0", async () => {
      // Branch: rate < 0
      await expect(
        service.updateCommissionService("adm1", -5),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("should throw 400 if rate is above 100", async () => {
      // Branch: rate > 100
      await expect(
        service.updateCommissionService("adm1", 150),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    test("should accept boundary values 0 and 100 without throwing", async () => {
      mockAdminUserRepository.updateAdminById.mockResolvedValue(undefined);

      await expect(service.updateCommissionService("adm1", 0)).resolves.toBe(0);

      await expect(service.updateCommissionService("adm1", 100)).resolves.toBe(
        100,
      );
    });
  });
});
