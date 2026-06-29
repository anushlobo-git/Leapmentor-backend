/**
 * @fileoverview Admin Payments Service Unit Tests
 * @description Validates financial telemetry, revenue chart compilation,
 * and paginated transaction queries with full branch coverage.
 */

const createAdminPaymentsService = require("../../../services/admin-payments.service");

// toTransactionDTO is imported directly inside the service, so jest.mock works here
jest.mock("../../../mappers/transaction.mapper", () => ({
  toTransactionDTO: jest.fn((t) => ({ DTO: true, id: t._id })),
}));

describe("Admin Payments Service", () => {
  let mockAdminUserRepository;
  let mockConnectRequestRepository;
  let mockWalletRepository;
  let mockTransactionRepository;
  let mockUserRepository;
  let service;

  beforeEach(() => {
    mockAdminUserRepository = { findAdminByIdLean: jest.fn() };
    mockConnectRequestRepository = {
      findCompletedPaidSessions: jest.fn(),
      countRefundedRequests: jest.fn(),
      findSessionsByMonth: jest.fn(),
    };
    mockWalletRepository = { findAllWallets: jest.fn() };
    mockTransactionRepository = {
      countTransactions: jest.fn(),
      findTransactions: jest.fn(),
    };
    mockUserRepository = { findUsersByName: jest.fn() };

    // ✅ Correct instantiation — matches the destructured signature
    service = createAdminPaymentsService({
      adminUserRepository: mockAdminUserRepository,
      connectRequestRepository: mockConnectRequestRepository,
      walletRepository: mockWalletRepository,
      transactionRepository: mockTransactionRepository,
      userRepository: mockUserRepository,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getPaymentStatsService ──────────────────────────────────────────────
  describe("getPaymentStatsService", () => {
    test("should compute revenue, commission, pending payouts and refunds using admin commission rate", async () => {
      mockAdminUserRepository.findAdminByIdLean.mockResolvedValue({
        commissionRate: 15,
      });
      mockConnectRequestRepository.findCompletedPaidSessions.mockResolvedValue([
        { totalAmount: 100, commissionAmount: 15 },
        { totalAmount: 200, commissionAmount: 30 },
      ]);
      mockWalletRepository.findAllWallets.mockResolvedValue([
        { escrow: 50 },
        { escrow: 25 },
      ]);
      mockConnectRequestRepository.countRefundedRequests.mockResolvedValue(3);

      const result = await service.getPaymentStatsService("adm001");

      expect(mockAdminUserRepository.findAdminByIdLean).toHaveBeenCalledWith(
        "adm001",
      );
      expect(result).toEqual({
        totalRevenue: 300,
        platformCommission: 45,
        commissionRate: 15,
        pendingPayouts: 75,
        refundedRequests: 3,
      });
    });

    test("should fall back to DEFAULT_COMMISSION_RATE (20) when admin has no commissionRate set", async () => {
      // Branch: adminUser?.commissionRate ?? DEFAULT_COMMISSION_RATE
      mockAdminUserRepository.findAdminByIdLean.mockResolvedValue(null);
      mockConnectRequestRepository.findCompletedPaidSessions.mockResolvedValue(
        [],
      );
      mockWalletRepository.findAllWallets.mockResolvedValue([]);
      mockConnectRequestRepository.countRefundedRequests.mockResolvedValue(0);

      const result = await service.getPaymentStatsService("adm001");

      expect(result.commissionRate).toBe(20);
    });

    test("should treat missing totalAmount and commissionAmount fields as zero", async () => {
      // Branch: session.totalAmount || 0  and  session.commissionAmount || 0
      mockAdminUserRepository.findAdminByIdLean.mockResolvedValue({
        commissionRate: 10,
      });
      mockConnectRequestRepository.findCompletedPaidSessions.mockResolvedValue([
        {}, // no totalAmount, no commissionAmount
      ]);
      mockWalletRepository.findAllWallets.mockResolvedValue([{}]); // no escrow
      mockConnectRequestRepository.countRefundedRequests.mockResolvedValue(0);

      const result = await service.getPaymentStatsService("adm001");

      expect(result.totalRevenue).toBe(0);
      expect(result.platformCommission).toBe(0);
      expect(result.pendingPayouts).toBe(0);
    });
  });

  // ── getRevenueChartService ──────────────────────────────────────────────
  describe("getRevenueChartService", () => {
    test("should return 6 monthly revenue entries with correct labels and summed amounts", async () => {
      mockConnectRequestRepository.findSessionsByMonth.mockResolvedValue([
        { totalAmount: 100 },
        { totalAmount: 50 },
      ]);

      const result = await service.getRevenueChartService();

      // 6 months lookback
      expect(result).toHaveLength(6);

      // Each entry has a label and amount
      result.forEach((entry) => {
        expect(entry).toHaveProperty("label");
        expect(entry).toHaveProperty("amount");
        expect(typeof entry.label).toBe("string");
        expect(entry.amount).toBe(150); // 100 + 50 per month
      });

      expect(
        mockConnectRequestRepository.findSessionsByMonth,
      ).toHaveBeenCalledTimes(6);
    });

    test("should return zero amount for months with no sessions", async () => {
      mockConnectRequestRepository.findSessionsByMonth.mockResolvedValue([]);

      const result = await service.getRevenueChartService();

      result.forEach((entry) => {
        expect(entry.amount).toBe(0);
      });
    });

    test("should treat missing totalAmount in sessions as zero", async () => {
      // Branch: session.totalAmount || 0
      mockConnectRequestRepository.findSessionsByMonth.mockResolvedValue([
        {}, // no totalAmount
      ]);

      const result = await service.getRevenueChartService();

      result.forEach((entry) => {
        expect(entry.amount).toBe(0);
      });
    });
  });

  // ── getTransactionsService ──────────────────────────────────────────────
  describe("getTransactionsService", () => {
    const mockTransactions = [{ _id: "txn1" }, { _id: "txn2" }];

    test("should return paginated transactions with default page and limit when none provided", async () => {
      mockTransactionRepository.countTransactions.mockResolvedValue(2);
      mockTransactionRepository.findTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await service.getTransactionsService({});

      // Default filter excludes 'credit' type
      expect(mockTransactionRepository.countTransactions).toHaveBeenCalledWith({
        type: { $ne: "credit" },
      });
      expect(mockTransactionRepository.findTransactions).toHaveBeenCalledWith(
        { type: { $ne: "credit" } },
        { skip: 0, limit: 10 },
      );
      expect(result.transactions).toEqual([
        { DTO: true, id: "txn1" },
        { DTO: true, id: "txn2" },
      ]);
      expect(result.pagination).toEqual({
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
        hasMore: false,
      });
    });

    test("should apply type filter when type param is provided", async () => {
      // Branch: if (type?.trim()) → filter.type = type.trim()
      mockTransactionRepository.countTransactions.mockResolvedValue(0);
      mockTransactionRepository.findTransactions.mockResolvedValue([]);

      await service.getTransactionsService({ type: "debit" });

      expect(mockTransactionRepository.countTransactions).toHaveBeenCalledWith({
        type: "debit",
      });
    });

    test("should search by user name and inject $in filter when search param is provided", async () => {
      // Branch: if (search?.trim())
      mockUserRepository.findUsersByName.mockResolvedValue([
        { _id: "u1" },
        { _id: "u2" },
      ]);
      mockTransactionRepository.countTransactions.mockResolvedValue(1);
      mockTransactionRepository.findTransactions.mockResolvedValue([]);

      await service.getTransactionsService({ search: "Alice" });

      expect(mockUserRepository.findUsersByName).toHaveBeenCalledWith("Alice");
      expect(mockTransactionRepository.countTransactions).toHaveBeenCalledWith({
        user: { $in: ["u1", "u2"] },
        type: { $ne: "credit" },
      });
    });

    test("should skip user search when search param is blank", async () => {
      mockTransactionRepository.countTransactions.mockResolvedValue(0);
      mockTransactionRepository.findTransactions.mockResolvedValue([]);

      await service.getTransactionsService({ search: "   " });

      expect(mockUserRepository.findUsersByName).not.toHaveBeenCalled();
    });

    test("should cap limit at MAX_LIMIT_SIZE (20) even if a higher value is passed", async () => {
      // Branch: Math.min(MAX_LIMIT_SIZE, ...)
      mockTransactionRepository.countTransactions.mockResolvedValue(0);
      mockTransactionRepository.findTransactions.mockResolvedValue([]);

      await service.getTransactionsService({ limit: 999 });

      expect(mockTransactionRepository.findTransactions).toHaveBeenCalledWith(
        expect.any(Object),
        { skip: 0, limit: 20 },
      );
    });

    test("should default page to 1 when an invalid page value is passed", async () => {
      // Branch: Math.max(1, parseInt(page) || DEFAULT_PAGE_NUMBER)
      mockTransactionRepository.countTransactions.mockResolvedValue(0);
      mockTransactionRepository.findTransactions.mockResolvedValue([]);

      await service.getTransactionsService({ page: "abc" });

      expect(mockTransactionRepository.findTransactions).toHaveBeenCalledWith(
        expect.any(Object),
        { skip: 0, limit: 10 },
      );
    });

    test("should compute correct skip and hasMore for a mid-range page", async () => {
      mockTransactionRepository.countTransactions.mockResolvedValue(50);
      mockTransactionRepository.findTransactions.mockResolvedValue([]);

      const result = await service.getTransactionsService({
        page: 2,
        limit: 10,
      });

      expect(mockTransactionRepository.findTransactions).toHaveBeenCalledWith(
        expect.any(Object),
        { skip: 10, limit: 10 },
      );
      expect(result.pagination).toEqual({
        totalCount: 50,
        currentPage: 2,
        totalPages: 5,
        hasMore: true,
      });
    });
  });
});
