/**
 * @fileoverview Admin Payments Controller Unit Tests
 * @description Verifies administrative ledger statistics queries, revenue timeline tracking,
 * cache lookup abstractions, and error propagation boundaries across ledger routes.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createAdminPaymentsController = require("../../../controllers/admin-payments.controller");

describe("AdminPaymentsController", () => {
  let mockAdminPaymentsService;
  let mockCacheUtility;
  let controller;
  let req;
  let res;
  let next;

  const mockStatsData = {
    totalProcessed: 50000,
    feeRevenue: 7500,
    dynamicEscrow: 1200,
  };
  const mockChartData = {
    intervals: ["Week 1", "Week 2"],
    deposits: [2500, 4300],
  };
  const mockLedgerResult = {
    transactions: [{ _id: "tx_999", gross: 150 }],
    count: 1,
  };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockAdminPaymentsService = {
      getPaymentStatsService: jest.fn(),
      getRevenueChartService: jest.fn(),
      getTransactionsService: jest.fn(),
    };

    mockCacheUtility = {
      getOrSetCache: jest.fn().mockImplementation(async (key, ttl, cb) => {
        return await cb();
      }),
    };

    controller = createAdminPaymentsController({
      adminPaymentsService: mockAdminPaymentsService,
      cacheUtility: mockCacheUtility,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      admin: { _id: "admin789" },
      query: {},
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

  // ── getPaymentStats ─────────────────────────────────────────────────────
  describe("getPaymentStats", () => {
    test("should fetch administrative stats through the Cache-Aside wrapper layer and return 200", async () => {
      mockAdminPaymentsService.getPaymentStatsService.mockResolvedValue(
        mockStatsData,
      );

      await controller.getPaymentStats(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:payments:telemetry-stats:admin789", // Fixed to match dynamic production key layout
        300,
        expect.any(Function),
      );
      expect(
        mockAdminPaymentsService.getPaymentStatsService,
      ).toHaveBeenCalledWith("admin789");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatsData,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should handle missing admin sub-properties gracefully without breaking execution", async () => {
      req.admin = undefined;
      mockAdminPaymentsService.getPaymentStatsService.mockResolvedValue(
        mockStatsData,
      );

      await controller.getPaymentStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    test("should pass runtime internal exceptions downstream to the Express error middleware layer", async () => {
      const error = new Error("Database network failure");
      mockCacheUtility.getOrSetCache.mockRejectedValue(error);

      await controller.getPaymentStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getRevenueChart ─────────────────────────────────────────────────────
  describe("getRevenueChart", () => {
    test("should resolve chronological revenue array using generic chart cache mappings", async () => {
      mockAdminPaymentsService.getRevenueChartService.mockResolvedValue(
        mockChartData,
      );

      await controller.getRevenueChart(req, res, next);

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:payments:revenue-charts", // Fixed to match target static key map
        300,
        expect.any(Function),
      );
      expect(
        mockAdminPaymentsService.getRevenueChartService,
      ).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockChartData,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should securely tunnel cache-level promise exceptions straight to next handler", async () => {
      const error = new Error("Redis connection dropped");
      mockCacheUtility.getOrSetCache.mockRejectedValue(error);

      await controller.getRevenueChart(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getTransactions ─────────────────────────────────────────────────────
  describe("getTransactions", () => {
    test("should forward incoming HTTP req query strings directly down to the ledger service pipeline", async () => {
      req.query = { page: "2", limit: "25", type: "escrow" };
      mockAdminPaymentsService.getTransactionsService.mockResolvedValue(
        mockLedgerResult,
      );

      await controller.getTransactions(req, res, next);

      expect(
        mockAdminPaymentsService.getTransactionsService,
      ).toHaveBeenCalledWith({
        page: "2",
        limit: "25",
        type: "escrow",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ...mockLedgerResult,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should capture unhandled controller execution errors inside catchAsync structures seamlessly", async () => {
      const error = new Error("Mongoose criteria structure mismatch");
      mockAdminPaymentsService.getTransactionsService.mockRejectedValue(error);

      await controller.getTransactions(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
