/**
 * @fileoverview Mentor Earnings and Financial Payout Controller Unit Tests
 * @description Verifies financial telemetry request parsing, trend chart period fallbacks,
 * payout history filtering, error propagation, and response flattening.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createEarningsController = require("../../../controllers/earnings.controller");

describe("EarningsController", () => {
  let mockEarningsService;
  let controller;
  let req;
  let res;
  let next;

  const mockSummaryData = {
    balance: 2500,
    escrowBalance: 400,
    totalWithdrawn: 1200,
  };
  const mockChartData = { labels: ["Jan", "Feb"], datasets: [1000, 1500] };
  const mockPayoutResult = {
    payouts: [{ _id: "po_999", amount: 500, status: "completed" }],
    total: 1,
  };
  const mockWithdrawalResult = {
    transactionId: "tx_with_777",
    estimatedArrival: "2026-07-02",
  };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockEarningsService = {
      getEarningsSummaryService: jest.fn(),
      getEarningsChartService: jest.fn(),
      getPayoutHistoryService: jest.fn(),
      withdrawEarningsService: jest.fn(),
    };

    controller = createEarningsController({
      earningsService: mockEarningsService,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      user: { _id: "mentor_default_555" },
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

  // ── getEarningsSummary ──────────────────────────────────────────────────
  describe("getEarningsSummary", () => {
    test("should return 200 and flatten summary details on success", async () => {
      req.user._id = "mentor_alpha_123";
      mockEarningsService.getEarningsSummaryService.mockResolvedValue(
        mockSummaryData,
      );

      await controller.getEarningsSummary(req, res, next);

      expect(
        mockEarningsService.getEarningsSummaryService,
      ).toHaveBeenCalledWith("mentor_alpha_123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        balance: 2500,
        escrowBalance: 400,
        totalWithdrawn: 1200,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Database collection lookup failed");
      mockEarningsService.getEarningsSummaryService.mockRejectedValue(error);

      await controller.getEarningsSummary(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getEarningsChart ────────────────────────────────────────────────────
  describe("getEarningsChart", () => {
    test("should return 200 and query weekly trends when period parameter is weekly", async () => {
      req.user._id = "mentor_beta_456";
      req.query.period = "weekly";
      mockEarningsService.getEarningsChartService.mockResolvedValue(
        mockChartData,
      );

      await controller.getEarningsChart(req, res, next);

      expect(mockEarningsService.getEarningsChartService).toHaveBeenCalledWith(
        "mentor_beta_456",
        "weekly",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        labels: ["Jan", "Feb"],
        datasets: [1000, 1500],
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should fall back to monthly trends when period parameter is invalid or omitted", async () => {
      req.user._id = "mentor_gamma_789";
      req.query.period = "invalid_string_token";
      mockEarningsService.getEarningsChartService.mockResolvedValue(
        mockChartData,
      );

      await controller.getEarningsChart(req, res, next);

      expect(mockEarningsService.getEarningsChartService).toHaveBeenCalledWith(
        "mentor_gamma_789",
        "monthly",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Aggregation pipeline execution timeout");
      mockEarningsService.getEarningsChartService.mockRejectedValue(error);

      await controller.getEarningsChart(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── getPayoutHistory ────────────────────────────────────────────────────
  describe("getPayoutHistory", () => {
    test("should return 200 and pass query filters to history service on success", async () => {
      req.user._id = "mentor_delta_000";
      req.query = { page: "2", status: "pending" };
      mockEarningsService.getPayoutHistoryService.mockResolvedValue(
        mockPayoutResult,
      );

      await controller.getPayoutHistory(req, res, next);

      expect(mockEarningsService.getPayoutHistoryService).toHaveBeenCalledWith(
        "mentor_delta_000",
        {
          page: "2",
          status: "pending",
        },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payouts: [{ _id: "po_999", amount: 500, status: "completed" }],
        total: 1,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Ledger audit tracking synchronization failed");
      mockEarningsService.getPayoutHistoryService.mockRejectedValue(error);

      await controller.getPayoutHistory(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ── withdrawEarnings ────────────────────────────────────────────────────
  describe("withdrawEarnings", () => {
    test("should return 200 and confirm withdrawal submission on success", async () => {
      req.user._id = "mentor_epsilon_888";
      mockEarningsService.withdrawEarningsService.mockResolvedValue(
        mockWithdrawalResult,
      );

      await controller.withdrawEarnings(req, res, next);

      expect(mockEarningsService.withdrawEarningsService).toHaveBeenCalledWith(
        "mentor_epsilon_888",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Withdrawal request submitted successfully",
        transactionId: "tx_with_777",
        estimatedArrival: "2026-07-02",
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when service throws", async () => {
      const error = new Error("Outbound wallet transfer settlement exception");
      mockEarningsService.withdrawEarningsService.mockRejectedValue(error);

      await controller.withdrawEarnings(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
