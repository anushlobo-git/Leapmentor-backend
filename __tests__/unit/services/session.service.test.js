/**
 * @fileoverview Session Management Logic Unit Tests
 * @description Validates structural ownership markers, Trusted link filters,
 * multi-party consensus locks, and exception routing completely in-memory.
 */

const createSessionService = require("../../../services/session.service");
const AppError = require("../../../utils/AppError");

describe("Session Stateless Domain Service Unit Tests", () => {
  let mockMongoose, mockConnectRepo, mockAvailabilityRepo, mockEscrowService;
  let mockReleaseEscrow,
    mockSocket,
    mockEmailUtils,
    mockGenerateSlots,
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

    mockMongoose = { startSession: jest.fn().mockResolvedValue(mockSession) };
    mockConnectRepo = {
      findByIdRaw: jest.fn(),
      save: jest.fn(),
      findByIdWithParticipants: jest.fn().mockResolvedValue({
        mentor: { name: "Mentor", email: "mentor@test.com" },
        mentee: { name: "Mentee", email: "mentee@test.com" },
      }),
    };
    mockAvailabilityRepo = { findAvailabilityByMentor: jest.fn() };
    mockEscrowService = { refundSlot: jest.fn() };
    mockReleaseEscrow = jest.fn().mockResolvedValue({ released: true });
    mockSocket = { emitToUser: jest.fn() };

    mockEmailUtils = {
      sendSlotCancelledEmail: jest.fn(),
      sendSlotRescheduledEmail: jest.fn(),
      sendAdditionalSlotEmail: jest.fn(),
      fireAndForgetEmail: jest.fn((task) => task()),
    };

    mockGenerateSlots = jest.fn().mockReturnValue([]);
    mockLogger = { warn: jest.fn(), error: jest.fn() };

    // CRITICAL FIX: Inject dependencies encapsulated inside a single destructured config object
    service = createSessionService({
      mongoose: mockMongoose,
      connectRequestRepo: mockConnectRepo,
      availabilityRepo: mockAvailabilityRepo,
      escrowService: mockEscrowService,
      releaseEscrow: mockReleaseEscrow,
      socketHandler: mockSocket,
      emailUtils: mockEmailUtils,
      generateAvailableSlots: mockGenerateSlots,
      logger: mockLogger,
    });
  });

  // ── getSlots ────────────────────────────────────────────────────────────
  describe("getSlots", () => {
    test("should throw 404 AppError if target connection request is missing", async () => {
      mockConnectRepo.findByIdRaw.mockResolvedValue(null);
      await expect(service.getSlots("missing_id", "user_1")).rejects.toThrow(
        new AppError("Session not found", 404),
      );
    });

    test("should compute metrics and progress successfully for active slots", async () => {
      mockConnectRepo.findByIdRaw.mockResolvedValue({
        mentor: "m_id",
        mentee: "u_id",
        selectedSlots: [
          { status: "booked", menteeMarked: true, mentorMarked: true },
        ],
        additionalSlots: [],
      });

      const result = await service.getSlots("req_id", "m_id");
      expect(result.progress).toBe(100);
      expect(result.totalSlots).toBe(1);
    });
  });

  // ── setMeetingLink ──────────────────────────────────────────────────────
  describe("setMeetingLink Workflow Shield", () => {
    test("should permit secure routing strings matching trusted white-listed parameters", async () => {
      const mockRequest = {
        mentor: "mentor_uuid",
        mentee: "mentee_uuid",
        status: "ongoing",
        selectedSlots: [{ meetingLink: "" }],
        markModified: jest.fn(),
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);

      const result = await service.setMeetingLink({
        connectRequestId: "req_id",
        slotIndex: "0",
        meetingLink: "https://meet.google.com/abc-defg-hij",
        userId: "mentor_uuid",
      });

      expect(result.slotIndex).toBe(0);
      expect(mockRequest.selectedSlots[0].meetingLink).toBe(
        "https://meet.google.com/abc-defg-hij",
      );
      expect(mockConnectRepo.save).toHaveBeenCalled();
    });

    test("should throw a 400 Bad Request exception if the provided URL fails trust specifications", async () => {
      const mockRequest = { mentor: "m", mentee: "u" };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);

      await expect(
        service.setMeetingLink({
          connectRequestId: "req_id",
          slotIndex: "0",
          meetingLink: "https://malicious-hijack-domain.com/phish",
          userId: "m",
        }),
      ).rejects.toThrow(
        new AppError(
          "Only links from trusted platforms (Google Meet, Zoom, etc.) are allowed.",
          400,
        ),
      );
    });
  });

  // ── markSlotComplete ────────────────────────────────────────────────────
  describe("markSlotComplete Consensus Layer", () => {
    test("should preserve single tracking markers and wait for other consensus signatures", async () => {
      const mockRequest = {
        mentor: "m_id",
        mentee: "u_id",
        status: "ongoing",
        selectedSlots: [
          { status: "booked", menteeMarked: false, mentorMarked: false },
        ],
        markModified: jest.fn(),
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);

      const result = await service.markSlotComplete({
        connectRequestId: "id",
        slotIndex: "0",
        userId: "u_id",
      });

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockRequest.selectedSlots[0].menteeMarked).toBe(true);
      expect(mockRequest.selectedSlots[0].mentorMarked).toBe(false);
      expect(result.bothMarked).toBe(false);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });

  // ── addSlot ─────────────────────────────────────────────────────────────
  describe("addSlot", () => {
    test("should throw 409 conflict error if the target slot configuration already exists", async () => {
      mockConnectRepo.findByIdRaw.mockResolvedValue({
        mentor: "m_id",
        mentee: "u_id",
        status: "ongoing",
        selectedSlots: [
          {
            date: "2026-07-01",
            startTime: "10:00",
            endTime: "11:00",
            status: "booked",
          },
        ],
      });

      await expect(
        service.addSlot({
          connectRequestId: "id",
          date: "2026-07-01",
          startTime: "10:00",
          endTime: "11:00",
          userId: "m_id",
        }),
      ).rejects.toThrow(
        new AppError("This slot already exists in the session", 409),
      );
    });

    test("should successfully push a new slot configuration onto ongoing sessions", async () => {
      const mockRequest = {
        mentor: "m_id",
        mentee: "u_id",
        status: "ongoing",
        selectedSlots: [],
        additionalSlots: [],
        markModified: jest.fn(),
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);

      const result = await service.addSlot({
        connectRequestId: "id",
        date: "2026-07-05",
        startTime: "14:00",
        endTime: "15:00",
        userId: "m_id",
      });

      expect(mockRequest.selectedSlots).toHaveLength(1);
      expect(result.slot.day).toBe("Sunday");
      expect(mockConnectRepo.save).toHaveBeenCalled();
    });
  });

  // ── cancelSlot ──────────────────────────────────────────────────────────
  describe("cancelSlot", () => {
    test("should mark selected slots as cancelled and execute refund triggers if already paid", async () => {
      const mockRequest = {
        mentor: "m_id",
        mentee: "u_id",
        status: "ongoing",
        paymentStatus: "paid",
        selectedSlots: [
          { status: "booked", menteeMarked: false, mentorMarked: false },
        ],
        markModified: jest.fn(),
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);
      mockEscrowService.refundSlot.mockResolvedValue({
        refundedAmount: 50,
        balance: 200,
        escrow: 0,
      });

      const result = await service.cancelSlot({
        connectRequestId: "id",
        slotIndex: "0",
        reason: "Emergency",
        userId: "m_id",
      });

      expect(mockRequest.selectedSlots[0].status).toBe("cancelled");
      expect(mockEscrowService.refundSlot).toHaveBeenCalled();
      expect(result.refund.refundedAmount).toBe(50);
    });
  });

  // ── rescheduleSlot ──────────────────────────────────────────────────────
  describe("rescheduleSlot", () => {
    test("should throw 403 AppError if a non-mentee attempts a rescheduling operation", async () => {
      mockConnectRepo.findByIdRaw.mockResolvedValue({
        mentor: "m_id",
        mentee: "u_id",
        status: "ongoing",
      });

      await expect(
        service.rescheduleSlot({
          connectRequestId: "id",
          slotIndex: "0",
          date: "2026-07-06",
          startTime: "09:00",
          endTime: "10:00",
          userId: "m_id",
        }),
      ).rejects.toThrow(
        new AppError("Only the mentee can reschedule slots", 403),
      );
    });

    test("should move the targeted slot state to cancelled and issue a new replacement booking configuration", async () => {
      const mockRequest = {
        mentor: "m_id",
        mentee: "u_id",
        status: "ongoing",
        selectedSlots: [
          {
            date: "2026-07-01",
            startTime: "10:00",
            endTime: "11:00",
            status: "booked",
          },
        ],
        markModified: jest.fn(),
      };
      mockConnectRepo.findByIdRaw.mockResolvedValue(mockRequest);

      const result = await service.rescheduleSlot({
        connectRequestId: "id",
        slotIndex: "0",
        date: "2026-07-08",
        startTime: "11:00",
        endTime: "12:00",
        userId: "u_id",
      });

      expect(mockRequest.selectedSlots[0].status).toBe("cancelled");
      expect(mockRequest.selectedSlots[1].status).toBe("booked");
      expect(result.newSlotIndex).toBe(1);
    });
  });
});
