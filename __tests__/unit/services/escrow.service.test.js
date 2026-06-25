/**
 * @fileoverview Escrow Ledger Service Unit Tests
 * @description Validates complex ledger mutations, multi-wallet balance shifts,
 * administrative tax boundaries, and database transaction consistency.
 */

const createEscrowService = require("../../../services/escrow.service");
const AppError = require("../../../utils/AppError");

describe("Escrow Service Unit Tests", () => {
  let mockMongoose,
    mockAdminRepo,
    mockConnectRepo,
    mockWalletRepo,
    mockTransactionRepo,
    mockMentorProfileRepo,
    mockAvailabilityRepo,
    mockFireAndForgetEmail,
    mockEmailUtils,
    mockCalendarUtils,
    mockLogger,
    service,
    mockSession;

  beforeEach(() => {
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    mockMongoose = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    mockAdminRepo = {
      findActiveAdmin: jest.fn(),
      incrementWalletBalance: jest.fn(),
    };

    mockConnectRepo = {
      findByIdWithParticipants: jest.fn(),
      findByIdRaw: jest.fn(),
      save: jest.fn(),
    };

    mockWalletRepo = {
      findByUserIdAndRole: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
    };

    mockTransactionRepo = {
      createMany: jest.fn(),
    };

    mockMentorProfileRepo = {
      findMentorProfile: jest.fn(),
    };

    mockAvailabilityRepo = {
      findAvailabilityByMentor: jest
        .fn()
        .mockResolvedValue({ timezone: "Asia/Kolkata" }),
    };

    mockFireAndForgetEmail = jest.fn((task) => task());

    mockEmailUtils = {
      sendInvoiceEmail: jest.fn().mockResolvedValue(true),
      sendPaymentReceivedEmail: jest.fn().mockResolvedValue(true),
    };

    mockCalendarUtils = {
      sendCalendarInvite: jest.fn().mockResolvedValue(true),
    };

    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = createEscrowService(
      mockMongoose,
      mockAdminRepo,
      mockConnectRepo,
      mockWalletRepo,
      mockTransactionRepo,
      mockMentorProfileRepo,
      mockAvailabilityRepo,
      mockFireAndForgetEmail,
      mockEmailUtils,
      mockCalendarUtils,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("pay Settlement Framework", () => {
    test("should isolate transaction scopes, move balance tokens to escrow, and commit safely", async () => {
      mockAdminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });

      const mockRequest = {
        _id: "req_id_001",
        mentee: {
          _id: "mentee_uuid_111",
          name: "Alice",
          email: "alice@test.com",
        },
        mentor: { _id: "mentor_uuid_222", name: "Bob", email: "bob@test.com" },
        status: "accepted",
        paymentStatus: "unpaid",
        selectedSlots: [],
        confirmedSlot: {},
      };
      mockConnectRepo.findByIdWithParticipants.mockResolvedValue(mockRequest);

      const mockWallet = { balance: 500, escrow: 0 };
      mockWalletRepo.findByUserIdAndRole.mockResolvedValue(mockWallet);

      const result = await service.pay({
        connectRequestId: "req_id_001",
        sessionRate: 100,
        sessionCount: 2,
        menteeId: "mentee_uuid_111",
      });

      // mentorAmount = 200, platformFee = 20, total = 220
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockWallet.balance).toBe(280);
      expect(mockWallet.escrow).toBe(220);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(result.paymentStatus).toBe("paid");
    });

    test("should abort structural transactions if the mentee has an insufficient wallet balance", async () => {
      mockAdminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 20 });
      mockConnectRepo.findByIdWithParticipants.mockResolvedValue({
        mentee: { _id: "m_id" },
        status: "accepted",
      });
      mockWalletRepo.findByUserIdAndRole.mockResolvedValue({
        balance: 10,
        escrow: 0,
      });

      await expect(
        service.pay({
          connectRequestId: "id",
          sessionRate: 100,
          sessionCount: 1,
          menteeId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe("release Payout Mechanisms", () => {
    test("should release escrowed funds directly to the mentor balance on explicit completion confirmations", async () => {
      mockAdminRepo.findActiveAdmin.mockResolvedValue({ _id: "admin_id" });

      const mockRequest = {
        _id: "req_id_002",
        mentee: "mentee_uuid_111",
        mentor: "mentor_uuid_222",
        status: "ongoing",
        paymentStatus: "paid",
        totalAmount: 120,
        mentorPayout: 100,
        commissionAmount: 20,
        commissionRate: 20,
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);

      const mockMenteeWallet = { escrow: 120 };
      const mockMentorWallet = { balance: 0 };
      mockWalletRepo.findByUserIdAndRole
        .mockResolvedValueOnce(mockMenteeWallet)
        .mockResolvedValueOnce(mockMentorWallet);

      const result = await service.release({
        requestId: "req_id_002",
        menteeId: "mentee_uuid_111",
      });

      expect(mockMenteeWallet.escrow).toBe(0);
      expect(mockMentorWallet.balance).toBe(100);
      expect(mockAdminRepo.incrementWalletBalance).toHaveBeenCalledWith(
        "admin_id",
        20,
      );
      expect(result.status).toBe("completed");
    });

    test("should compute status metrics from selected slots when connect request totals are missing", async () => {
      mockAdminRepo.findActiveAdmin.mockResolvedValue({ commissionRate: 10 });

      const mockRequest = {
        _id: "req_id_004",
        mentee: "mentee_uuid_111",
        mentor: "mentor_uuid_222",
        status: "accepted",
        paymentStatus: "unpaid",
        selectedSlots: [
          { date: "2026-06-26", startTime: "10:00", endTime: "11:00" },
        ],
        confirmedSlot: {
          day: "Friday",
          date: "2026-06-26",
          startTime: "10:00",
          endTime: "11:00",
        },
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);
      mockMentorProfileRepo.findMentorProfile.mockResolvedValue({
        hourlyRate: 100,
      });
      mockWalletRepo.findByUserId.mockResolvedValue({
        balance: 851,
        escrow: 15,
      });

      const result = await service.getStatus({
        requestId: "req_id_004",
        userId: "mentee_uuid_111",
      });

      expect(result.sessionRate).toBe(100);
      expect(result.sessionCount).toBe(1);
      expect(result.totalAmount).toBe(100);
      expect(result.confirmedSlot).toEqual(mockRequest.confirmedSlot);
      expect(result.wallet).toEqual({ balance: 851, escrow: 15 });
    });
  });

  describe("refund Configurations", () => {
    test("should transfer tokens back to clear balance tracks during sudden session rejection cycles", async () => {
      const mockRequest = {
        mentee: "mentee_uuid_111",
        mentor: "mentor_uuid_222",
        paymentStatus: "paid",
        status: "ongoing",
        totalAmount: 150,
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);

      const mockWallet = { balance: 50, escrow: 150 };
      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet);

      const result = await service.refund({
        requestId: "req_id_003",
        userId: "mentee_uuid_111",
      });

      expect(mockWallet.escrow).toBe(0);
      expect(mockWallet.balance).toBe(200);
      expect(result.paymentStatus).toBe("refunded");
    });
  });
});
