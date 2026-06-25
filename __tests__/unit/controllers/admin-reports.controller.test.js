/**
 * @fileoverview Admin Reports Controller Unit Tests
 * @description Validates HTTP parameters routing, Cache-Aside execution blocks,
 * and active invalidation routines.
 */

const createAdminReportsController = require("../../../controllers/admin-reports.controller");

describe("Admin Reports Controller Unit Tests", () => {
  let mockService;
  let mockCacheUtility;
  let controller;
  let mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      getReportStatsService: jest.fn(),
      getReportsService: jest.fn(),
      handleReportService: jest.fn(),
      processRefundService: jest.fn(),
      deleteSessionService: jest.fn(),
    };

    mockCacheUtility = {
      getOrSetCache: jest
        .fn()
        .mockImplementation(async (key, ttl, fetchFn) => await fetchFn()),
      evictCache: jest.fn(),
    };

    controller = createAdminReportsController(mockService, mockCacheUtility);

    mockReq = { admin: { _id: "adminRoot" }, params: {}, body: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("getReportStats should leverage cache proxies directly to offload aggregations", async () => {
    mockService.getReportStatsService.mockResolvedValue({ totalReports: 5 });

    await controller.getReportStats(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
      "admin:reports:telemetry-stats",
      300,
      expect.any(Function),
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, totalReports: 5 }),
    );
  });

  test("handleReport should trigger clean-up evictions immediately when mutating states", async () => {
    mockReq.params.id = "rep123";
    mockReq.body = { status: "resolved", adminNote: "Settled." };
    mockService.handleReportService.mockResolvedValue({ _id: "rep123" });

    await controller.handleReport(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCacheUtility.evictCache).toHaveBeenCalledWith(
      "admin:reports:telemetry-stats",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
