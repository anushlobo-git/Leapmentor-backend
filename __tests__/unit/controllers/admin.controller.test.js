/**
 * @fileoverview Admin Controller Corporate Unit Tests
 * @description Validates HTTP boundary processing, payload cache routing pipelines,
 * and operational status responses with zero server infrastructure runtime activity.
 */

const createAdminController = require("../../../controllers/admin.controller");

describe("Admin Controller", () => {
  let mockAdminAuthService;
  let mockAdminStatsService;
  let mockAdminUserService;
  let mockAdminEngagementService;
  let mockCacheUtility;
  let controller;

  let mockReq;
  let mockRes;
  let mockNext;

  // ✅ Corporate Helper: Forces Jest to yield execution until all background microtasks drain completely
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
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

    // Simulate Cache-Aside mechanics passing queries through straight to target callbacks on cache misses
    mockCacheUtility = {
      getOrSetCache: jest
        .fn()
        .mockImplementation(async (key, ttl, fetchFn) => await fetchFn()),
    };

    controller = createAdminController(
      mockAdminAuthService,
      mockAdminStatsService,
      mockAdminUserService,
      mockAdminEngagementService,
      mockCacheUtility,
    );

    mockReq = { body: {}, query: {}, params: {}, cookie: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── AUTHENTICATION LAYER ────────────────────────────────────────────────
  describe("adminLogin", () => {
    test("should issue secure tracking tokens inside HTTP-Only response cookies on successful authentication", async () => {
      mockReq.body = { email: "root@test.com", password: "password" };
      mockAdminAuthService.adminLoginService.mockResolvedValue({
        token: "jwt_token",
        admin: { name: "Root Admin" },
      });

      await controller.adminLogin(mockReq, mockRes, mockNext);
      await flushPromises(); // ✅ Yield queue execution context

      expect(mockAdminAuthService.adminLoginService).toHaveBeenCalledWith(
        mockReq.body,
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "adminToken",
        "jwt_token",
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        admin: { name: "Root Admin" },
      });
    });
  });

  // ── CACHED TELEMETRY STATS LAYER ────────────────────────────────────────
  describe("getStats Cached Telemetry Routers", () => {
    test("should routes queries through the cache utility layer to offload high database aggregation operations", async () => {
      const mockStatsPayload = { totalUsers: 50, totalMentors: 25 };
      mockAdminStatsService.getStatsService.mockResolvedValue(mockStatsPayload);

      await controller.getStats(mockReq, mockRes, mockNext);
      await flushPromises(); // ✅ Yield queue execution context to let nested cache/service loops resolve

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:telemetry:stats",
        300,
        expect.any(Function),
      );
      expect(mockAdminStatsService.getStatsService).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStatsPayload);
    });
  });

  describe("getUserGrowth", () => {
    test("should fetch rolling user timeline data structures using cache buffers", async () => {
      const mockGrowthPayload = [{ label: "Jun 23", count: 12 }];
      mockAdminStatsService.getUserGrowthService.mockResolvedValue(
        mockGrowthPayload,
      );

      await controller.getUserGrowth(mockReq, mockRes, mockNext);
      await flushPromises(); // ✅ Yield queue execution context

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:telemetry:growth",
        300,
        expect.any(Function),
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockGrowthPayload);
    });
  });

  // ── UN-CACHED USER INTERVENTIONS LAYER ──────────────────────────────────
  describe("blockUser", () => {
    test("should bypass caching mechanisms entirely to guarantee real-time updates for security actions", async () => {
      mockReq.params.userId = "user_to_block";
      mockAdminUserService.blockUserService.mockResolvedValue({
        name: "Malicious User",
      });

      await controller.blockUser(mockReq, mockRes, mockNext);
      await flushPromises(); // ✅ Yield queue execution context

      expect(mockCacheUtility.getOrSetCache).not.toHaveBeenCalled();
      expect(mockAdminUserService.blockUserService).toHaveBeenCalledWith(
        "user_to_block",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });
});
