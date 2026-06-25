/**
 * @fileoverview Admin Settings Controller Caching Unit Tests
 */

const createAdminSettingsController = require("../../../controllers/admin-settings.controller");

describe("Admin Settings Controller", () => {
  let mockService, mockCache, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      getOverviewService: jest.fn(),
      addAdminService: jest.fn(),
      updateCommissionService: jest.fn(),
    };
    mockCache = {
      getOrSetCache: jest
        .fn()
        .mockImplementation(async (key, ttl, fetchFn) => await fetchFn()),
      evictCache: jest.fn(),
    };
    controller = createAdminSettingsController(mockService, mockCache);
    mockReq = { admin: { _id: "super_root" }, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("getOverview should pipe queries through the cache proxy handler", async () => {
    mockService.getOverviewService.mockResolvedValue({ totalUsers: 10 });
    await controller.getOverview(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCache.getOrSetCache).withContext &&
      expect(mockCache.getOrSetCache).toHaveBeenCalledWith(
        "admin:settings:dashboard-overview",
        300,
        expect.any(Function),
      );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
