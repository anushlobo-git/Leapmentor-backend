/**
 * @fileoverview Admin Reports Controller Unit Tests
 * @description Verifies validation parsing constraints, Cache-Aside telemetry tracking,
 * automatic cache invalidations, and response schema flattening with zero network access.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createAdminReportsController = require("../../../controllers/admin-reports.controller");

describe("AdminReportsController", () => {
  let mockAdminReportsService;
  let mockCacheUtility;
  let controller;
  let req;
  let res;
  let next;

  const mockStatsData = {
    totalReports: 25,
    pendingReports: 5,
    resolvedReports: 20,
  };
  const mockReportsResult = {
    reports: [{ _id: "rep123", reason: "Spam" }],
    totalCount: 1,
  };
  const mockReportRecord = {
    _id: "rep123",
    status: "resolved",
    adminNote: "Violation confirmed",
  };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockAdminReportsService = {
      getReportStatsService: jest.fn(),
      getReportsService: jest.fn(),
      handleReportService: jest.fn(),
      processRefundService: jest.fn(),
      deleteSessionService: jest.fn(),
    };

    // Emulate Cache-Aside logic: execute the underlying service callback directly
    mockCacheUtility = {
      getOrSetCache: jest.fn().mockImplementation(async (key, ttl, cb) => {
        return await cb();
      }),
      evictCache: jest.fn().mockResolvedValue(true),
    };

    controller = createAdminReportsController({
      adminReportsService: mockAdminReportsService,
      cacheUtility: mockCacheUtility,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      admin: { _id: "admin777" },
      params: {},
      body: {},
      query: {},
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

  // ── getReportStats ──────────────────────────────────────────────────────
  describe("getReportStats", () => {
    test("should retrieve telemetry reports data using the Cache-Aside layer and spread output metrics", async () => {
      mockAdminReportsService.getReportStatsService.mockResolvedValue(
        mockStatsData,
      );

      await controller.getReportStats(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:reports:telemetry-stats",
        300,
        expect.any(Function),
      );
      expect(mockAdminReportsService.getReportStatsService).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalReports: 25,
        pendingReports: 5,
        resolvedReports: 20,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should securely pass exceptions arising within getReportStats downstream via next handler", async () => {
      const error = new Error("Redis cluster failover");
      mockCacheUtility.getOrSetCache.mockRejectedValue(error);

      await controller.getReportStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getReports ──────────────────────────────────────────────────────────
  describe("getReports", () => {
    test("should pass query string filter arguments down to the service layer and flatten spread responses", async () => {
      req.query = { status: "pending", page: "1" };
      mockAdminReportsService.getReportsService.mockResolvedValue(
        mockReportsResult,
      );

      await controller.getReports(req, res, next);

      expect(mockAdminReportsService.getReportsService).toHaveBeenCalledWith({
        status: "pending",
        page: "1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        reports: [{ _id: "rep123", reason: "Spam" }],
        totalCount: 1,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should catch service pipeline errors inside catchAsync boundaries gracefully", async () => {
      const error = new Error("Mongoose criteria parsing failure");
      mockAdminReportsService.getReportsService.mockRejectedValue(error);

      await controller.getReports(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── handleReport ────────────────────────────────────────────────────────
  describe("handleReport", () => {
    test("should execute processing methods, invalidate telemetry cache counters, and return the report record context", async () => {
      req.params.id = "rep123";
      req.body = { status: "resolved", adminNote: "Violation confirmed" };
      mockAdminReportsService.handleReportService.mockResolvedValue(
        mockReportRecord,
      );

      await controller.handleReport(req, res, next);

      expect(mockAdminReportsService.handleReportService).toHaveBeenCalledWith(
        "rep123",
        req.body,
        "admin777",
      );
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:reports:telemetry-stats",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Report resolved.",
        report: mockReportRecord,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should handle cases where evictCache helper is missing from tracking utilities layout gracefully", async () => {
      mockCacheUtility.evictCache = undefined;
      req.params.id = "rep123";
      req.body = { status: "resolved" };
      mockAdminReportsService.handleReportService.mockResolvedValue(
        mockReportRecord,
      );

      await controller.handleReport(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ── processRefund ───────────────────────────────────────────────────────
  describe("processRefund", () => {
    test("should trigger billing reversal procedures, purge active reports cache keys, and output confirmation statements", async () => {
      req.params.id = "rep123";
      req.body.adminNote = "Refunding due to verified mentor noshow";
      mockAdminReportsService.processRefundService.mockResolvedValue({
        refundAmount: 150,
      });

      await controller.processRefund(req, res, next);

      expect(mockAdminReportsService.processRefundService).toHaveBeenCalledWith(
        "rep123",
        "Refunding due to verified mentor noshow",
        "admin777",
      );
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:reports:telemetry-stats",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Refund of 150 tokens processed successfully.",
        refundAmount: 150,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when processRefund throws", async () => {
      req.params.id = "rep123";
      const error = new Error("Refund failed due to internal billing error");
      mockAdminReportsService.processRefundService.mockRejectedValue(error);

      await controller.processRefund(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── deleteSession ───────────────────────────────────────────────────────
  describe("deleteSession", () => {
    test("should drop scheduling blocks, deploy structural cache updates, and confirm operations status back", async () => {
      req.params.id = "rep123";
      req.body.adminNote = "Violated terms of service";
      mockAdminReportsService.deleteSessionService.mockResolvedValue(true);

      await controller.deleteSession(req, res, next);

      expect(mockAdminReportsService.deleteSessionService).toHaveBeenCalledWith(
        "rep123",
        "Violated terms of service",
        "admin777",
      );
      expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
        "admin:reports:telemetry-stats",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Session deleted and both parties notified.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when deleteSession throws", async () => {
      req.params.id = "rep123";
      const error = new Error("Session deletion failed");
      mockAdminReportsService.deleteSessionService.mockRejectedValue(error);

      await controller.deleteSession(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
