/**
 * @fileoverview Admin Payments Subsystem Integration and Unit Validation Tests
 */

const createAdminPaymentsService = require("../../../services/admin-payments.service");
const createAdminPaymentsController = require("../../../controllers/admin-payments.controller");

describe("Admin Payments Vertical Architecture Slice", () => {
  let mockAdminUserRepo,
    mockConnectRequestRepo,
    mockWalletRepo,
    mockTransactionRepo,
    mockUserRepo;
  let service, controller, mockCacheUtility, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockAdminUserRepo = { findAdminByIdLean: jest.fn() };
    mockConnectRequestRepo = {
      findCompletedPaidSessions: jest.fn(),
      countRefundedRequests: jest.fn(),
      findSessionsByMonth: jest.fn(),
    };
    mockWalletRepo = { findAllWallets: jest.fn() };
    mockTransactionRepo = {
      countTransactions: jest.fn(),
      findTransactions: jest.fn(),
    };
    mockUserRepo = { findUsersByName: jest.fn() };

    service = createAdminPaymentsService(
      mockAdminUserRepo,
      mockConnectRequestRepo,
      mockWalletRepo,
      mockTransactionRepo,
      mockUserRepo,
    );

    mockCacheUtility = {
      getOrSetCache: jest
        .fn()
        .mockImplementation(async (key, ttl, fetchFn) => await fetchFn()),
    };

    controller = createAdminPaymentsController(service, mockCacheUtility);

    mockReq = { admin: { _id: "adm001" }, query: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("Service should correctly process telemetry summaries across financial boundaries", async () => {
    mockAdminUserRepo.findAdminByIdLean.mockResolvedValue({
      commissionRate: 15,
    });
    mockConnectRequestRepo.findCompletedPaidSessions.mockResolvedValue([
      { totalAmount: 100, commissionAmount: 15 },
    ]);
    mockWalletRepo.findAllWallets.mockResolvedValue([{ escrow: 50 }]);
    mockConnectRequestRepo.countRefundedRequests.mockResolvedValue(1);

    const metrics = await service.getPaymentStatsService("adm001");
    expect(metrics.totalRevenue).toBe(100);
    expect(metrics.commissionRate).toBe(15);
  });

  test("Controller should routes queries through the cache utility layer to offload high database aggregation operations", async () => {
    mockAdminUserRepo.findAdminByIdLean.mockResolvedValue({
      commissionRate: 20,
    });
    mockConnectRequestRepo.findCompletedPaidSessions.mockResolvedValue([]);
    mockWalletRepo.findAllWallets.mockResolvedValue([]);
    mockConnectRequestRepo.countRefundedRequests.mockResolvedValue(0);

    await controller.getPaymentStats(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
      expect.stringContaining("admin:payments:telemetry-stats"),
      300,
      expect.any(Function),
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
