/**
 * @fileoverview Mentor Earnings Controller Unit Tests
 * @description Validates request parameter mining, payload flattening structures,
 * response status validations, and boundary error routing patterns.
 */

const createEarningsController = require("../../../controllers/earnings.controller");

describe("Mentor Earnings Controller Unit Tests", () => {
  let mockEarningsService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockEarningsService = {
      getEarningsSummaryService: jest.fn(),
      getEarningsChartService: jest.fn(),
      getPayoutHistoryService: jest.fn(),
      withdrawEarningsService: jest.fn(),
    };

    controller = createEarningsController(mockEarningsService);

    mockReq = { user: { _id: "mentor_test_id_99" }, query: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getEarningsSummary should pass user context keys and return an aggregated object structure", async () => {
    const mockSummary = { totalEarnings: 1200, walletBalance: 400 };
    mockEarningsService.getEarningsSummaryService.mockResolvedValue(
      mockSummary,
    );

    await controller.getEarningsSummary(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockEarningsService.getEarningsSummaryService).toHaveBeenCalledWith(
      "mentor_test_id_99",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      ...mockSummary,
    });
  });

  test("getEarningsChart should default unallocated period parameters to monthly distributions", async () => {
    mockReq.query.period = undefined; // Force fallback logic check
    mockEarningsService.getEarningsChartService.mockResolvedValue({ data: [] });

    await controller.getEarningsChart(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockEarningsService.getEarningsChartService).toHaveBeenCalledWith(
      "mentor_test_id_99",
      "monthly",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test("getPayoutHistory should parse query criteria configurations and return paginated row maps", async () => {
    mockReq.query = { page: "2", limit: "10" };
    const mockHistory = { payouts: [], pagination: {} };
    mockEarningsService.getPayoutHistoryService.mockResolvedValue(mockHistory);

    await controller.getPayoutHistory(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockEarningsService.getPayoutHistoryService).toHaveBeenCalledWith(
      "mentor_test_id_99",
      mockReq.query,
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test("withdrawEarnings should return successful transaction receipts along with a 200 status code", async () => {
    const mockReceipt = { withdrawn: 400, newBalance: 0 };
    mockEarningsService.withdrawEarningsService.mockResolvedValue(mockReceipt);

    await controller.withdrawEarnings(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockEarningsService.withdrawEarningsService).toHaveBeenCalledWith(
      "mentor_test_id_99",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Withdrawal request submitted successfully",
      ...mockReceipt,
    });
  });

  test("should trap processing rejections and route them straight down to next() for central logging", async () => {
    const mockError = new Error("Wallet registration records not found.");
    mockEarningsService.withdrawEarningsService.mockRejectedValue(mockError);

    await controller.withdrawEarnings(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockError);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
