/**
 * @fileoverview Admin Payments Controller Corporate Unit Tests
 * @description Validates HTTP boundary processing, cache-aside routing lookups,
 * and transaction tracking mapping loops based on explicit req.admin parameters.
 */

const createAdminPaymentsController = require("../../../controllers/admin-payments.controller");

describe("Admin Payments Controller", () => {
  let mockAdminPaymentsService;
  let mockCacheUtility;
  let controller;
  let mockReq;
  let mockRes;
  let mockNext;

  // Corporate Helper: Forces Jest to yield execution context until catchAsync microtask promises drain completely
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockAdminPaymentsService = {
      getPaymentStatsService: jest.fn(),
      getRevenueChartService: jest.fn(),
      getTransactionsService: jest.fn(),
    };

    // Simulate standard Cache-Aside operations by instantly executing the underlying data fetch callback
    mockCacheUtility = {
      getOrSetCache: jest
        .fn()
        .mockImplementation(async (key, ttl, fetchFn) => await fetchFn()),
    };

    controller = createAdminPaymentsController(
      mockAdminPaymentsService,
      mockCacheUtility,
    );

    mockReq = {
      admin: { _id: "admin_payout_root" },
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getPaymentStats ─────────────────────────────────────────────────────
  describe("getPaymentStats", () => {
    const mockStatsPayload = { totalRevenue: 5000, platformCommission: 1000 };

    test("should extract req.admin._id explicitly, pass it to the cache layer, and return serialized stats", async () => {
      mockAdminPaymentsService.getPaymentStatsService.mockResolvedValue(
        mockStatsPayload,
      );

      await controller.getPaymentStats(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:payments:telemetry-stats:admin_payout_root",
        300,
        expect.any(Function),
      );
      expect(
        mockAdminPaymentsService.getPaymentStatsService,
      ).toHaveBeenCalledWith("admin_payout_root");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatsPayload,
      });
    });

    test("should pass undefined to the cache utility layer if req.admin structure is completely missing", async () => {
      mockReq.admin = undefined;
      mockAdminPaymentsService.getPaymentStatsService.mockResolvedValue(
        mockStatsPayload,
      );

      await controller.getPaymentStats(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:payments:telemetry-stats:undefined",
        300,
        expect.any(Function),
      );
      expect(
        mockAdminPaymentsService.getPaymentStatsService,
      ).toHaveBeenCalledWith(undefined);
    });
  });

  // ── getRevenueChart ─────────────────────────────────────────────────────
  describe("getRevenueChart", () => {
    test("should routes queries through the cache utility layer to offload high database aggregation operations", async () => {
      const mockChartPayload = [{ label: "JAN", amount: 450 }];
      mockAdminPaymentsService.getRevenueChartService.mockResolvedValue(
        mockChartPayload,
      );

      await controller.getRevenueChart(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
        "admin:payments:revenue-charts",
        300,
        expect.any(Function),
      );
      expect(
        mockAdminPaymentsService.getRevenueChartService,
      ).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockChartPayload,
      });
    });
  });

  // ── getTransactions ─────────────────────────────────────────────────────
  describe("getTransactions", () => {
    test("should bypass caching mechanisms to pull ledger listings directly from the data service", async () => {
      const mockTxPayload = { transactions: [], pagination: {} };
      mockReq.query = { page: "1", limit: "10", type: "debit" };
      mockAdminPaymentsService.getTransactionsService.mockResolvedValue(
        mockTxPayload,
      );

      await controller.getTransactions(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockCacheUtility.getOrSetCache).not.toHaveBeenCalled();
      expect(
        mockAdminPaymentsService.getTransactionsService,
      ).toHaveBeenCalledWith(mockReq.query);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ...mockTxPayload,
      });
    });
  });
});
