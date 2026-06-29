/**
 * @fileoverview Admin Controller Unit Tests
 * @description Verifies administrative authentication, Cache-Aside platform telemetry stats,
 * user intervention commands, error propagation, and response serialization.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createAdminController = require("../../../controllers/admin.controller");

describe("AdminController", () => {
  let mockAdminAuthService;
  let mockAdminStatsService;
  let mockAdminUserService;
  let mockAdminEngagementService;
  let mockCacheUtility;
  let controller;
  let req;
  let res;
  let next;

  const mockAdminData = {
    _id: "adm_111",
    email: "admin@leapmentor.com",
    role: "superadmin",
  };
  const mockTelemetryStats = { usersCount: 500, mentorsCount: 120 };
  const mockGrowthData = [{ day: "2026-06-28", count: 5 }];
  const mockIndustryStats = [{ industry: "Tech", count: 45 }];
  const mockUsersCollection = { users: [{ _id: "u1" }], total: 1 };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockAdminAuthService = { adminLoginService: jest.fn() };
    mockAdminStatsService = {
      getStatsService: jest.fn(),
      getUserGrowthService: jest.fn(),
      getMentorIndustryStatsService: jest.fn(),
    };
    mockAdminUserService = {
      getUsersService: jest.fn(),
      getUserDetailService: jest.fn(),
      deleteUserService: jest.fn(),
      blockUserService: jest.fn(),
      unblockUserService: jest.fn(),
    };
    mockAdminEngagementService = {
      getEngagementStatsService: jest.fn(),
      getEngagementsService: jest.fn(),
    };

    // Emulate Cache-Aside logic: execute the underlying service callback directly
    mockCacheUtility = {
      getOrSetCache: jest.fn().mockImplementation(async (key, ttl, cb) => {
        return await cb();
      }),
    };

    controller = createAdminController({
      adminAuthService: mockAdminAuthService,
      adminStatsService: mockAdminStatsService,
      adminUserService: mockAdminUserService,
      adminEngagementService: mockAdminEngagementService,
      cacheUtility: mockCacheUtility,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      admin: { _id: "adm_default" },
      body: {},
      query: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── AUTHENTICATION HANDLERS ─────────────────────────────────────────────
  describe("Authentication Handlers", () => {
    test("should set cookie and return 200 with admin profile on successful login", async () => {
      req.body = { email: "admin@test.com", password: "password" };
      mockAdminAuthService.adminLoginService.mockResolvedValue({
        token: "jwt_token_xyz",
        admin: mockAdminData,
      });

      await controller.adminLogin(req, res, next);

      expect(mockAdminAuthService.adminLoginService).toHaveBeenCalledWith(
        req.body,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "adminToken",
        "jwt_token_xyz",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        admin: mockAdminData,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when login service throws", async () => {
      const error = new Error("Invalid admin credentials");
      mockAdminAuthService.adminLoginService.mockRejectedValue(error);

      await controller.adminLogin(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should clear adminToken token cookie and return 200 on logout", () => {
      controller.adminLogout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        "adminToken",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Logged out.",
      });
    });

    test("should return 200 and serialize current profile data matching req.admin", async () => {
      req.admin = { _id: "adm_variant_555", email: "variant@test.com" };

      await controller.adminMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ admin: req.admin });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── TELEMETRY STATS HANDLERS ────────────────────────────────────────────
  describe("Telemetry Stats Handlers", () => {
    test("should return 200 and raw metrics via Cache-Aside wrapper in getStats", async () => {
      mockAdminStatsService.getStatsService.mockResolvedValue(
        mockTelemetryStats,
      );

      await controller.getStats(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:telemetry:stats",
        300,
        expect.any(Function),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTelemetryStats);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when getStats service throws", async () => {
      const error = new Error("Telemetry metrics unavailable");
      mockAdminStatsService.getStatsService.mockRejectedValue(error);

      await controller.getStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should return 200 and timeline matrices via Cache-Aside wrapper in getUserGrowth", async () => {
      mockAdminStatsService.getUserGrowthService.mockResolvedValue(
        mockGrowthData,
      );

      await controller.getUserGrowth(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:telemetry:growth",
        300,
        expect.any(Function),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockGrowthData);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when getUserGrowth service throws", async () => {
      const error = new Error("Growth breakdown failed");
      mockAdminStatsService.getUserGrowthService.mockRejectedValue(error);

      await controller.getUserGrowth(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should return 200 and sector distributions via Cache-Aside wrapper in getMentorIndustryStats", async () => {
      mockAdminStatsService.getMentorIndustryStatsService.mockResolvedValue(
        mockIndustryStats,
      );

      await controller.getMentorIndustryStats(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:telemetry:industries",
        300,
        expect.any(Function),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockIndustryStats);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when getMentorIndustryStats service throws", async () => {
      const error = new Error("Industry breakdown failed");
      mockAdminStatsService.getMentorIndustryStatsService.mockRejectedValue(
        error,
      );

      await controller.getMentorIndustryStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── USER MANAGEMENT HANDLERS ────────────────────────────────────────────
  describe("User Management Handlers", () => {
    test("should return 200 and pass query variables to filter service inside getUsers", async () => {
      req.query = { role: "mentee", limit: "10" };
      mockAdminUserService.getUsersService.mockResolvedValue(
        mockUsersCollection,
      );

      await controller.getUsers(req, res, next);

      expect(mockAdminUserService.getUsersService).toHaveBeenCalledWith({
        role: "mentee",
        limit: "10",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsersCollection);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when getUsers service throws", async () => {
      const error = new Error("User listing database breach");
      mockAdminUserService.getUsersService.mockRejectedValue(error);

      await controller.getUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should return 200 and load complete details using router parameters inside getUserDetail", async () => {
      req.params.userId = "usr_target999";
      const targetDetail = { _id: "usr_target999", name: "Alice" };
      mockAdminUserService.getUserDetailService.mockResolvedValue(targetDetail);

      await controller.getUserDetail(req, res, next);

      expect(mockAdminUserService.getUserDetailService).toHaveBeenCalledWith(
        "usr_target999",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(targetDetail);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when getUserDetail service throws", async () => {
      req.params.userId = "usr_missing";
      const error = new Error("User document missing");
      mockAdminUserService.getUserDetailService.mockRejectedValue(error);

      await controller.getUserDetail(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should return 200 and confirm hard-delete string interpolations inside deleteUser", async () => {
      req.params.userId = "usr_drop_777";
      mockAdminUserService.deleteUserService.mockResolvedValue({
        name: "Bob Dev",
        email: "bob@test.com",
      });

      await controller.deleteUser(req, res, next);

      expect(mockAdminUserService.deleteUserService).toHaveBeenCalledWith(
        "usr_drop_777",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User Bob Dev (bob@test.com) has been permanently deleted.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when deleteUser service throws", async () => {
      req.params.userId = "usr_error";
      const error = new Error("Write locks conflict");
      mockAdminUserService.deleteUserService.mockRejectedValue(error);

      await controller.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should return 200 and confirm status notification string interpolations inside blockUser", async () => {
      req.params.userId = "usr_block_456";
      mockAdminUserService.blockUserService.mockResolvedValue({
        name: "Charlie",
      });

      await controller.blockUser(req, res, next);

      expect(mockAdminUserService.blockUserService).toHaveBeenCalledWith(
        "usr_block_456",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User Charlie has been blocked.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when blockUser service throws", async () => {
      req.params.userId = "usr_fail";
      const error = new Error("Block script aborted");
      mockAdminUserService.blockUserService.mockRejectedValue(error);

      await controller.blockUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should return 200 and confirm restoration message string interpolations inside unblockUser", async () => {
      req.params.userId = "usr_restore_123";
      mockAdminUserService.unblockUserService.mockResolvedValue({
        name: "David",
      });

      await controller.unblockUser(req, res, next);

      expect(mockAdminUserService.unblockUserService).toHaveBeenCalledWith(
        "usr_restore_123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User David has been restored.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when unblockUser service throws", async () => {
      req.params.userId = "usr_fail";
      const error = new Error("Unblock script aborted");
      mockAdminUserService.unblockUserService.mockRejectedValue(error);

      await controller.unblockUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── SYSTEM ENGAGEMENT HANDLERS ──────────────────────────────────────────
  describe("System Engagement Handlers", () => {
    test("should return 200 and engagement summaries via Cache-Aside wrapper in getEngagementStats", async () => {
      const mockEngagementStats = { totalSessions: 1500, matchRate: "85%" };
      mockAdminEngagementService.getEngagementStatsService.mockResolvedValue(
        mockEngagementStats,
      );

      await controller.getEngagementStats(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:telemetry:engagements",
        300,
        expect.any(Function),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEngagementStats);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when getEngagementStats service throws", async () => {
      const error = new Error("Engagement metrics failed");
      mockAdminEngagementService.getEngagementStatsService.mockRejectedValue(
        error,
      );

      await controller.getEngagementStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test("should return 200 and pass structured parameter constraints down to getEngagements", async () => {
      req.query = { page: "3", status: "ongoing" };
      const mockEngagementsResult = { items: [{ _id: "eng_1" }], count: 1 };
      mockAdminEngagementService.getEngagementsService.mockResolvedValue(
        mockEngagementsResult,
      );

      await controller.getEngagements(req, res, next);

      expect(
        mockAdminEngagementService.getEngagementsService,
      ).toHaveBeenCalledWith({ page: "3", status: "ongoing" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEngagementsResult);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when getEngagements service throws", async () => {
      const error = new Error("Engagement query failure");
      mockAdminEngagementService.getEngagementsService.mockRejectedValue(error);

      await controller.getEngagements(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
