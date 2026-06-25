/**
 * @fileoverview Mentor Earnings and Financial Ledger Service Unit Tests
 * @description Assures valid financial aggregation metrics, temporal data grouping logic,
 * pagination safety windows, and safe balance drain states.
 */

const createEarningsService = require("../../../services/earnings.service");
const AppError = require("../../../utils/AppError");

describe("Mentor Earnings Service Unit Tests", () => {
  let mockConnectRepo,
    mockMentorRepo,
    mockWalletRepo,
    mockTransactionRepo,
    mockUserRepo,
    service;

  beforeEach(() => {
    mockConnectRepo = {
      findCompletedSessionsByMentor: jest.fn(),
      findOngoingPaidSessionsByMentor: jest.fn(),
      findCompletedSessionsByMentorSince: jest.fn(),
      countPayoutHistory: jest.fn(),
      findPayoutHistory: jest.fn(),
    };
    mockMentorRepo = {
      findMentorRating: jest.fn(),
    };
    mockWalletRepo = {
      findWalletByUser: jest.fn(),
      findWalletByUserMutable: jest.fn(),
      saveWallet: jest.fn(),
    };
    mockTransactionRepo = {
      createTransaction: jest.fn(),
    };
    mockUserRepo = {
      findUsersByNameSearch: jest.fn(),
    };

    service = createEarningsService(
      mockConnectRepo,
      mockMentorRepo,
      mockWalletRepo,
      mockTransactionRepo,
      mockUserRepo,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getEarningsSummaryService Calculations", () => {
    test("should sum totals and count current month sessions correctly", async () => {
      const mockCompleted = [
        { totalAmount: 100, completedAt: "2026-06-20T10:00:00.000Z" },
        { totalAmount: 150, completedAt: "2026-06-22T12:00:00.000Z" },
      ];
      mockConnectRepo.findCompletedSessionsByMentor.mockResolvedValue(
        mockCompleted,
      );
      mockConnectRepo.findOngoingPaidSessionsByMentor.mockResolvedValue([
        { mentorPayout: 40 },
      ]);
      mockMentorRepo.findMentorRating.mockResolvedValue({ avgRating: 4.8 });
      mockWalletRepo.findWalletByUser.mockResolvedValue({ balance: 500 });

      const result = await service.getEarningsSummaryService("mentor_101");

      expect(result.totalEarnings).toBe(250);
      expect(result.pendingPayout).toBe(40);
      expect(result.avgRating).toBe(4.8);
      expect(result.walletBalance).toBe(500);
    });
  });

  describe("getEarningsChartService Metrics", () => {
    test("should generate exactly 6 elements for monthly layout distributions", async () => {
      mockConnectRepo.findCompletedSessionsByMentorSince.mockResolvedValue([]);

      const result = await service.getEarningsChartService(
        "mentor_101",
        "monthly",
      );

      expect(result.period).toBe("monthly");
      expect(result.data).toHaveLength(6);
    });
  });

  describe("getPayoutHistoryService Pagination Lookups", () => {
    test("should fall back to standard default limit and page settings if query params are missing", async () => {
      mockConnectRepo.countPayoutHistory.mockResolvedValue(0);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([]);

      const result = await service.getPayoutHistoryService("mentor_101", {
        page: null,
        limit: undefined,
      });

      expect(mockConnectRepo.findPayoutHistory).toHaveBeenCalledWith(
        expect.any(Object),
        { skip: 0, limit: 10 },
      );
      expect(result.pagination.currentPage).toBe(1);
    });
  });

  describe("withdrawEarningsService Inbound Transfers", () => {
    test("should cleanly flush balances to 0 and log an audit tracking entry", async () => {
      const mockWalletInstance = { balance: 350 };
      mockWalletRepo.findWalletByUserMutable.mockResolvedValue(
        mockWalletInstance,
      );
      mockWalletRepo.saveWallet.mockResolvedValue();
      mockTransactionRepo.createTransaction.mockResolvedValue();

      const result = await service.withdrawEarningsService("mentor_101");

      expect(mockWalletInstance.balance).toBe(0);
      expect(mockWalletRepo.saveWallet).toHaveBeenCalledWith(
        mockWalletInstance,
      );
      expect(mockTransactionRepo.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "withdrawal", amount: 350 }),
      );
      expect(result).toEqual({ withdrawn: 350, newBalance: 0 });
    });

    test("should throw a 404 error if wallet record is not found", async () => {
      mockWalletRepo.findWalletByUserMutable.mockResolvedValue(null);

      await expect(
        service.withdrawEarningsService("invalid_id"),
      ).rejects.toThrow(
        new AppError("Wallet registration records not found.", 404),
      );
    });

    test("should throw a 400 error if balance is empty", async () => {
      mockWalletRepo.findWalletByUserMutable.mockResolvedValue({ balance: 0 });

      await expect(service.withdrawEarningsService("broke_id")).rejects.toThrow(
        new AppError(
          "No clear liquid balances are currently available to withdraw.",
          400,
        ),
      );
    });
  });
});
