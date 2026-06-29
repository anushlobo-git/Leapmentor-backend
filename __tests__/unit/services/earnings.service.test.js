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

    service = createEarningsService({
      connectRequestRepository: mockConnectRepo,
      mentorRepository: mockMentorRepo,
      walletRepository: mockWalletRepo,
      transactionRepository: mockTransactionRepo,
      userRepository: mockUserRepo,
    });

    // ✅ FIXED: Freeze system clock to eliminate environmental floating time metrics
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-24T12:00:00.000Z"));
  });

  afterEach(() => {
    // ✅ FIXED: Clear fakes and safely restore native clock functions
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getEarningsSummaryService
  // ---------------------------------------------------------------------------
  describe("getEarningsSummaryService Calculations", () => {
    test("should sum totals and count current month sessions correctly", async () => {
      const now = new Date();
      const thisMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        15,
      ).toISOString();
      const lastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        15,
      ).toISOString();

      const mockCompleted = [
        { totalAmount: 100, completedAt: thisMonth },
        { totalAmount: 150, completedAt: thisMonth },
        { totalAmount: 50, completedAt: lastMonth },
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

      expect(result.totalEarnings).toBe(300);
      expect(result.sessionsThisMonth).toBe(2);
      expect(result.pendingPayout).toBe(40);
      expect(result.avgRating).toBe(4.8);
      expect(result.walletBalance).toBe(500);
    });

    test("should handle sessions with missing totalAmount (|| 0) and missing mentorPayout (|| 0)", async () => {
      mockConnectRepo.findCompletedSessionsByMentor.mockResolvedValue([
        { totalAmount: null, completedAt: null },
      ]);
      mockConnectRepo.findOngoingPaidSessionsByMentor.mockResolvedValue([
        { mentorPayout: null },
      ]);
      mockMentorRepo.findMentorRating.mockResolvedValue({ avgRating: 4.8 });
      mockWalletRepo.findWalletByUser.mockResolvedValue({ balance: 100 });

      const result = await service.getEarningsSummaryService("mentor_101");

      expect(result.totalEarnings).toBe(0);
      expect(result.pendingPayout).toBe(0);
      expect(result.sessionsThisMonth).toBe(0);
    });

    test("should fall back to 0 avgRating when mentorProfile is null (?.avgRating || 0)", async () => {
      mockConnectRepo.findCompletedSessionsByMentor.mockResolvedValue([]);
      mockConnectRepo.findOngoingPaidSessionsByMentor.mockResolvedValue([]);
      mockMentorRepo.findMentorRating.mockResolvedValue(null);
      mockWalletRepo.findWalletByUser.mockResolvedValue({ balance: 0 });

      const result =
        await service.getEarningsSummaryService("mentor_no_profile");

      expect(result.avgRating).toBe(0);
    });

    test("should fall back to 0 walletBalance when wallet is null (?.balance || 0)", async () => {
      mockConnectRepo.findCompletedSessionsByMentor.mockResolvedValue([]);
      mockConnectRepo.findOngoingPaidSessionsByMentor.mockResolvedValue([]);
      mockMentorRepo.findMentorRating.mockResolvedValue({ avgRating: 3.0 });
      mockWalletRepo.findWalletByUser.mockResolvedValue(null);

      const result =
        await service.getEarningsSummaryService("mentor_no_wallet");

      expect(result.walletBalance).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getEarningsChartService
  // ---------------------------------------------------------------------------
  describe("getEarningsChartService Metrics", () => {
    test("should generate exactly 6 elements for monthly layout with correct labels and amounts", async () => {
      const now = new Date();
      const thisMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        10,
      ).toISOString();
      const oldDate = new Date(now.getFullYear() - 2, 0, 1).toISOString();

      mockConnectRepo.findCompletedSessionsByMentorSince.mockResolvedValue([
        { completedAt: thisMonth, totalAmount: 200 },
        { completedAt: oldDate, totalAmount: 999 },
        { completedAt: thisMonth, totalAmount: null },
      ]);

      const result = await service.getEarningsChartService(
        "mentor_101",
        "monthly",
      );

      expect(result.period).toBe("monthly");
      expect(result.data).toHaveLength(6);

      const lastBucket = result.data[result.data.length - 1];
      expect(lastBucket.amount).toBe(200);
      result.data.forEach(({ label }) => expect(label).toMatch(/^[A-Z]{3}$/));
    });

    test("should generate exactly 8 elements for weekly layout with correct W-labels and amounts", async () => {
      const now = new Date();

      // ✅ FIXED: Positioned 3 days behind the frozen baseline clock to guarantee
      // the amount safely lands inside the tracking weekly aggregation matrix bounds.
      const withinRange = new Date(now);
      withinRange.setDate(withinRange.getDate() - 3);

      const tooOld = new Date(now);
      tooOld.setDate(tooOld.getDate() - 90);

      mockConnectRepo.findCompletedSessionsByMentorSince.mockResolvedValue([
        { completedAt: withinRange.toISOString(), totalAmount: 75 },
        { completedAt: tooOld.toISOString(), totalAmount: 999 },
        { completedAt: withinRange.toISOString(), totalAmount: null },
      ]);

      const result = await service.getEarningsChartService(
        "mentor_101",
        "weekly",
      );

      expect(result.period).toBe("weekly");
      expect(result.data).toHaveLength(8);
      result.data.forEach(({ label }, idx) =>
        expect(label).toBe(`W${idx + 1}`),
      );

      const total = result.data.reduce((sum, { amount }) => sum + amount, 0);
      expect(total).toBe(75);
    });
  });

  // ---------------------------------------------------------------------------
  // getPayoutHistoryService
  // ---------------------------------------------------------------------------
  describe("getPayoutHistoryService Pagination Lookups", () => {
    test("should fall back to default page=1 and limit=10 when query params are missing", async () => {
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

    test("should cap limit at MAX_LIMIT_SIZE (20) even if query requests more", async () => {
      mockConnectRepo.countPayoutHistory.mockResolvedValue(0);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([]);

      await service.getPayoutHistoryService("mentor_101", {
        page: "1",
        limit: "99",
      });

      expect(mockConnectRepo.findPayoutHistory).toHaveBeenCalledWith(
        expect.any(Object),
        { skip: 0, limit: 20 },
      );
    });

    test("should perform user name search and filter mentee $in when search is provided", async () => {
      mockUserRepo.findUsersByNameSearch.mockResolvedValue([
        { _id: "user_1" },
        { _id: "user_2" },
      ]);
      mockConnectRepo.countPayoutHistory.mockResolvedValue(0);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([]);

      await service.getPayoutHistoryService("mentor_101", {
        search: "  Alice  ",
      });

      expect(mockUserRepo.findUsersByNameSearch).toHaveBeenCalledWith("Alice");
      expect(mockConnectRepo.countPayoutHistory).toHaveBeenCalledWith(
        expect.objectContaining({ mentee: { $in: ["user_1", "user_2"] } }),
      );
    });

    test("should map a fully-populated payout row correctly", async () => {
      mockConnectRepo.countPayoutHistory.mockResolvedValue(1);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([
        {
          _id: "payout_1",
          completedAt: "2026-06-15T00:00:00.000Z",
          mentee: { name: "Bob", email: "bob@example.com" },
          confirmedSlot: { day: "Monday", startTime: "9:00", endTime: "10:30" },
          totalAmount: 120,
          paymentStatus: "paid",
        },
      ]);

      const result = await service.getPayoutHistoryService("mentor_101", {});

      const row = result.payouts[0];
      expect(row.id).toBe("payout_1");
      expect(row.menteeName).toBe("Bob");
      expect(row.menteeEmail).toBe("bob@example.com");
      expect(row.sessionType).toBe("Monday");
      expect(row.duration).toBe("90 mins");
      expect(row.amount).toBe(120);
      expect(row.status).toBe("paid");
    });

    test("should use fallback dashes when payout fields are absent", async () => {
      mockConnectRepo.countPayoutHistory.mockResolvedValue(1);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([
        {
          _id: "payout_2",
          completedAt: null,
          mentee: null,
          confirmedSlot: null,
          totalAmount: null,
          paymentStatus: null,
        },
      ]);

      const result = await service.getPayoutHistoryService("mentor_101", {});

      const row = result.payouts[0];
      expect(row.date).toBe("—");
      expect(row.menteeName).toBe("—");
      expect(row.menteeEmail).toBe("—");
      expect(row.sessionType).toBe("—");
      expect(row.duration).toBe("—");
      expect(row.amount).toBe(0);
      expect(row.status).toBe("paid");
    });

    test("should use default startTime/endTime '0:0' when confirmedSlot times are missing", async () => {
      mockConnectRepo.countPayoutHistory.mockResolvedValue(1);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([
        {
          _id: "payout_3",
          completedAt: "2026-06-10T00:00:00.000Z",
          mentee: { name: "Eve" },
          confirmedSlot: { day: "Tuesday" },
          totalAmount: 50,
          paymentStatus: "paid",
        },
      ]);

      const result = await service.getPayoutHistoryService("mentor_101", {});
      expect(result.payouts[0].duration).toBe("0 mins");
    });

    test("should return correct pagination metadata", async () => {
      mockConnectRepo.countPayoutHistory.mockResolvedValue(25);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([]);

      const result = await service.getPayoutHistoryService("mentor_101", {
        page: "2",
        limit: "10",
      });

      expect(result.pagination).toEqual({
        totalCount: 25,
        currentPage: 2,
        totalPages: 3,
        hasMore: true,
      });
    });

    test("should report hasMore=false on the last page", async () => {
      mockConnectRepo.countPayoutHistory.mockResolvedValue(10);
      mockConnectRepo.findPayoutHistory.mockResolvedValue([]);

      const result = await service.getPayoutHistoryService("mentor_101", {
        page: "1",
        limit: "10",
      });

      expect(result.pagination.hasMore).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // withdrawEarningsService
  // ---------------------------------------------------------------------------
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
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Wallet registration records not found.",
      });
    });

    test("should throw a 400 error if balance is empty", async () => {
      mockWalletRepo.findWalletByUserMutable.mockResolvedValue({ balance: 0 });

      await expect(
        service.withdrawEarningsService("broke_id"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message:
          "No clear liquid balances are currently available to withdraw.",
      });
    });
  });
});
