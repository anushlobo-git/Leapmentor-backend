/**
 * @fileoverview Admin Settings Controller Unit Tests
 * @description Verifies administrative configuration parameter updates, Cache-Aside dashboard lookup pipelines,
 * proxy cache invalidation hooks, and payload extraction matrices with zero network connectivity.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createAdminSettingsController = require("../../../controllers/admin-settings.controller");

describe("AdminSettingsController", () => {
  let mockAdminSettingsService;
  let mockCacheUtility;
  let controller;
  let req;
  let res;
  let next;

  const mockOverviewData = {
    totalUsers: 1500,
    activeMentorships: 340,
    pendingPayouts: 12,
  };
  const mockAdminResult = {
    adminId: "adm_new123",
    email: "staff@leapmentor.com",
    role: "moderator",
  };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockAdminSettingsService = {
      getOverviewService: jest.fn(),
      changeAdminPasswordService: jest.fn(),
      addAdminService: jest.fn(),
      getCommissionService: jest.fn(),
      updateCommissionService: jest.fn(),
    };

    // Emulate Cache-Aside logic: execute the underlying service callback directly
    mockCacheUtility = {
      getOrSetCache: jest.fn().mockImplementation(async (key, ttl, cb) => {
        return await cb();
      }),
      evictCache: jest.fn().mockResolvedValue(true),
    };

    controller = createAdminSettingsController({
      adminSettingsService: mockAdminSettingsService,
      cacheUtility: mockCacheUtility,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      admin: { _id: "super_admin_999" },
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getOverview ─────────────────────────────────────────────────────────
  describe("getOverview", () => {
    test("should fetch platform summary benchmarks through the caching intercept layer and flatten spread output keys", async () => {
      mockAdminSettingsService.getOverviewService.mockResolvedValue(
        mockOverviewData,
      );

      await controller.getOverview(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:settings:dashboard-overview",
        300,
        expect.any(Function),
      );
      expect(mockAdminSettingsService.getOverviewService).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalUsers: 1500,
        activeMentorships: 340,
        pendingPayouts: 12,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should tunnel underlying cache-level asynchronous errors straight down to next handler", async () => {
      const error = new Error("Redis memory fragmentation limit hit");
      mockCacheUtility.getOrSetCache.mockRejectedValue(error);

      await controller.getOverview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── changePassword ──────────────────────────────────────────────────────
  describe("changePassword", () => {
    test("should pass authentication parameters directly to credentials security subservices", async () => {
      req.body = {
        oldPassword: "Password123!",
        newPassword: "SecurePassword2026!",
      };
      mockAdminSettingsService.changeAdminPasswordService.mockResolvedValue(
        true,
      );

      await controller.changePassword(req, res, next);

      expect(
        mockAdminSettingsService.changeAdminPasswordService,
      ).toHaveBeenCalledWith("super_admin_999", req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Password changed successfully.",
      });
    });
  });

  // ── addAdmin ────────────────────────────────────────────────────────────
  describe("addAdmin", () => {
    test("should provision account resources, purge metric caches to maintain integrity, and reply with HTTP 201 status", async () => {
      req.body = { email: "staff@leapmentor.com", role: "moderator" };
      mockAdminSettingsService.addAdminService.mockResolvedValue(
        mockAdminResult,
      );

      await controller.addAdmin(req, res, next);

      expect(mockAdminSettingsService.addAdminService).toHaveBeenCalledWith(
        req.body,
      );
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:settings:dashboard-overview",
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Admin account created for staff@leapmentor.com.",
        adminId: "adm_new123",
        email: "staff@leapmentor.com",
        role: "moderator",
      });
    });

    test("should support silent execution steps if evictCache handle is missing on cache utility configurations", async () => {
      mockCacheUtility.evictCache = undefined;
      req.body = { email: "staff@leapmentor.com" };
      mockAdminSettingsService.addAdminService.mockResolvedValue(
        mockAdminResult,
      );

      await controller.addAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── getCommission ───────────────────────────────────────────────────────
  describe("getCommission", () => {
    test("should extract current operational commission threshold percentages cleanly", async () => {
      mockAdminSettingsService.getCommissionService.mockResolvedValue(15);

      await controller.getCommission(req, res, next);

      expect(
        mockAdminSettingsService.getCommissionService,
      ).toHaveBeenCalledWith("super_admin_999");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        commissionRate: 15,
      });
    });
  });

  // ── updateCommission ────────────────────────────────────────────────────
  describe("updateCommission", () => {
    test("should update platform fee margins and emit formatted string confirmation logs containing percentage parameters", async () => {
      req.body = { commissionRate: 12 };
      mockAdminSettingsService.updateCommissionService.mockResolvedValue(12);

      await controller.updateCommission(req, res, next);

      expect(
        mockAdminSettingsService.updateCommissionService,
      ).toHaveBeenCalledWith("super_admin_999", 12);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Commission rate updated to 12%",
        commissionRate: 12,
      });
    });
  });
});
