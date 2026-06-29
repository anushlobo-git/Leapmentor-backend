/**
 * @fileoverview Complete 100% Line & Branch Coverage Suite for Session Service
 */

const createSessionService = require("../../../services/session.service");
const AppError = require("../../../utils/AppError");

describe("Session Service Core Pipelines — 100% Full Coverage", () => {
  let service, mockConnectRepo, mockAvailabilityRepo, mockEscrowService;
  let mockReleaseEscrow,
    mockSocket,
    mockEmailUtils,
    mockGenerateSlots,
    mockLogger,
    mockSession;

  const buildBaseRequest = () => ({
    mentor: "m_id",
    mentee: "u_id",
    status: "ongoing",
    paymentStatus: "unpaid",
    selectedSlots: [],
    additionalSlots: [],
    markModified: jest.fn(),
  });

  beforeEach(() => {
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
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

    service = createSessionService({
      mongoose: { startSession: jest.fn().mockResolvedValue(mockSession) },
      connectRequestRepo: mockConnectRepo,
      availabilityRepo: mockAvailabilityRepo,
      escrowService: mockEscrowService,
      releaseEscrow: mockReleaseEscrow,
      socketHandler: mockSocket,
      emailUtils: mockEmailUtils,
      generateAvailableSlots: mockGenerateSlots,
      logger: mockLogger,
    });

    jest.useFakeTimers().setSystemTime(new Date("2026-06-24T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ── getSlots Pipeline ───────────────────────────────────────────────────
  describe("getSlots Pipeline", () => {
    test("should isolate structural authorization rejections and process progress formulas", async () => {
      mockConnectRepo.findByIdRaw.mockResolvedValueOnce(null);
      await expect(service.getSlots("id", "u_id")).rejects.toThrow(
        new AppError("Session not found", 404),
      );

      const req = buildBaseRequest();
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      await expect(service.getSlots("id", "intruder")).rejects.toThrow(
        new AppError("Not authorized", 403),
      );

      const activeResult = await service.getSlots("id", "u_id");
      expect(activeResult.progress).toBe(0);

      req.selectedSlots = [
        { status: "booked", menteeMarked: true, mentorMarked: true },
      ];
      const validResult = await service.getSlots("id", "u_id");
      expect(validResult.progress).toBe(100);
    });
  });

  // ── setMeetingLink Pipeline ─────────────────────────────────────────────
  describe("setMeetingLink Pipeline", () => {
    test("should check parameters limits, URL protocols, status markers, and route telemetry changes", async () => {
      await expect(
        service.setMeetingLink({
          connectRequestId: "id",
          slotIndex: "0",
          meetingLink: "",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      const req = buildBaseRequest();
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      await expect(
        service.setMeetingLink({
          connectRequestId: "id",
          slotIndex: "0",
          meetingLink: "https://untrusted.com",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);
      await expect(
        service.setMeetingLink({
          connectRequestId: "id",
          slotIndex: "0",
          meetingLink: "http://meet.google.com/abc",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      req.status = "completed";
      await expect(
        service.setMeetingLink({
          connectRequestId: "id",
          slotIndex: "0",
          meetingLink: "https://meet.google.com/abc",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      req.status = "ongoing";
      await expect(
        service.setMeetingLink({
          connectRequestId: "id",
          slotIndex: "2",
          meetingLink: "https://meet.google.com/abc",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      req.selectedSlots = [{ meetingLink: "" }];
      const result = await service.setMeetingLink({
        connectRequestId: "id",
        slotIndex: "0",
        meetingLink: "https://meet.google.com/abc",
        userId: "m_id",
      });
      expect(result.slot.meetingLink).toBe("https://meet.google.com/abc");

      mockSocket.emitToUser.mockImplementationOnce(() => {
        throw new Error("fail");
      });
      await expect(
        service.setMeetingLink({
          connectRequestId: "id",
          slotIndex: "0",
          meetingLink: "https://zoom.us/abc",
          userId: "m_id",
        }),
      ).resolves.toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  // ── markSlotComplete Pipeline ───────────────────────────────────────────
  describe("markSlotComplete Pipeline", () => {
    test("should evaluate signature guards, execute state alterations, and roll back on rejections", async () => {
      const req = buildBaseRequest();
      req.selectedSlots = [
        { status: "cancelled", menteeMarked: false, mentorMarked: false },
      ];
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      await expect(
        service.markSlotComplete({
          connectRequestId: "id",
          slotIndex: "0",
          userId: "u_id",
        }),
      ).rejects.toThrow(AppError);

      req.selectedSlots = [
        { status: "booked", menteeMarked: true, mentorMarked: true },
      ];
      await expect(
        service.markSlotComplete({
          connectRequestId: "id",
          slotIndex: "0",
          userId: "u_id",
        }),
      ).rejects.toThrow(AppError);

      req.selectedSlots = [
        { status: "booked", menteeMarked: true, mentorMarked: false },
      ];
      await expect(
        service.markSlotComplete({
          connectRequestId: "id",
          slotIndex: "0",
          userId: "u_id",
        }),
      ).rejects.toThrow(AppError);

      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: true },
      ];
      await expect(
        service.markSlotComplete({
          connectRequestId: "id",
          slotIndex: "0",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: false },
      ];
      let res = await service.markSlotComplete({
        connectRequestId: "id",
        slotIndex: "0",
        userId: "u_id",
      });
      expect(res.bothMarked).toBe(false);

      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: false },
      ];
      res = await service.markSlotComplete({
        connectRequestId: "id",
        slotIndex: "0",
        userId: "m_id",
      });
      expect(res.bothMarked).toBe(false);

      req.selectedSlots = [
        { status: "booked", menteeMarked: true, mentorMarked: false },
      ];
      res = await service.markSlotComplete({
        connectRequestId: "id",
        slotIndex: "0",
        userId: "m_id",
      });
      expect(res.allComplete).toBe(true);
      expect(mockReleaseEscrow).toHaveBeenCalled();

      mockConnectRepo.findByIdRaw.mockRejectedValueOnce(new Error("DB error"));
      await expect(
        service.markSlotComplete({
          connectRequestId: "id",
          slotIndex: "0",
          userId: "u_id",
        }),
      ).rejects.toThrow("DB error");
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  // ── addSlot Pipeline ────────────────────────────────────────────────────
  describe("addSlot Pipeline", () => {
    test("should check parameters availability constraints, evaluate collisions, and trigger alert emails", async () => {
      await expect(
        service.addSlot({ connectRequestId: "id", userId: "m_id" }),
      ).rejects.toThrow(AppError);

      const req = buildBaseRequest();
      req.selectedSlots = [
        {
          date: "2026-07-05",
          startTime: "10:00",
          endTime: "11:00",
          status: "booked",
        },
      ];
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      await expect(
        service.addSlot({
          connectRequestId: "id",
          date: "2026-07-05",
          startTime: "10:00",
          endTime: "11:00",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      req.selectedSlots = [];
      req.additionalSlots = [
        { date: "2026-07-05", startTime: "10:00", endTime: "11:00" },
      ];
      await expect(
        service.addSlot({
          connectRequestId: "id",
          date: "2026-07-05",
          startTime: "10:00",
          endTime: "11:00",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      req.additionalSlots = [];
      const result = await service.addSlot({
        connectRequestId: "id",
        date: "2026-07-05",
        startTime: "14:00",
        endTime: "15:00",
        userId: "m_id",
      });
      expect(result.slot.day).toBe("Sunday");

      mockConnectRepo.findByIdWithParticipants.mockRejectedValueOnce(
        new Error("Mail fail"),
      );
      await service.addSlot({
        connectRequestId: "id",
        date: "2026-07-06",
        startTime: "14:00",
        endTime: "15:00",
        userId: "m_id",
      });
      await Promise.resolve();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ── cancelSlot Pipeline ─────────────────────────────────────────────────
  describe("cancelSlot Pipeline", () => {
    test("should execute state invalidation paths and selectively trigger escrow refund actions", async () => {
      const req = buildBaseRequest();
      req.selectedSlots = [{ status: "cancelled" }];
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      await expect(
        service.cancelSlot({
          connectRequestId: "id",
          slotIndex: "0",
          reason: "x",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      req.selectedSlots = [
        { status: "booked", menteeMarked: true, mentorMarked: true },
      ];
      await expect(
        service.cancelSlot({
          connectRequestId: "id",
          slotIndex: "0",
          reason: "x",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      // COVERAGE FOR LINES: Hit both cancelledBy branches (mentor vs mentee role triggers) and email catches
      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: false },
      ];
      mockConnectRepo.findByIdWithParticipants.mockRejectedValueOnce(
        new Error("Cancel Mail Error"),
      );
      let result = await service.cancelSlot({
        connectRequestId: "id",
        slotIndex: "0",
        reason: "Emergency",
        userId: "m_id",
      });
      expect(result.slot.cancelledBy).toBe("mentor");
      await Promise.resolve();
      expect(mockLogger.error).toHaveBeenCalled();

      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: false },
      ];
      result = await service.cancelSlot({
        connectRequestId: "id",
        slotIndex: "0",
        reason: "Emergency",
        userId: "u_id",
      });
      expect(result.slot.cancelledBy).toBe("mentee");
      expect(result.refund).toBeNull();

      req.paymentStatus = "paid";
      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: false },
      ];
      mockEscrowService.refundSlot.mockResolvedValueOnce({
        refundedAmount: 50,
      });
      result = await service.cancelSlot({
        connectRequestId: "id",
        slotIndex: "0",
        reason: "Emergency",
        userId: "u_id",
      });
      expect(result.refund.refundedAmount).toBe(50);

      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: false },
      ];
      mockEscrowService.refundSlot.mockRejectedValueOnce(
        new Error("Refund fail"),
      );
      await expect(
        service.cancelSlot({
          connectRequestId: "id",
          slotIndex: "0",
          reason: "x",
          userId: "m_id",
        }),
      ).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ── rescheduleSlot Pipeline ─────────────────────────────────────────────
  describe("rescheduleSlot Pipeline", () => {
    test("should validate identity roles and swap old reservations for new allocations successfully", async () => {
      await expect(
        service.rescheduleSlot({
          connectRequestId: "id",
          slotIndex: "0",
          userId: "u_id",
        }),
      ).rejects.toThrow(AppError);

      const req = buildBaseRequest();
      req.selectedSlots = [
        {
          date: "2026-07-01",
          startTime: "10:00",
          endTime: "11:00",
          status: "booked",
        },
      ];
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      await expect(
        service.rescheduleSlot({
          connectRequestId: "id",
          slotIndex: "0",
          date: "2026-07-08",
          startTime: "10:00",
          endTime: "11:00",
          userId: "m_id",
        }),
      ).rejects.toThrow(AppError);

      // COVERAGE FOR LINES: Hit reschedule email .catch logging branch explicitly
      mockConnectRepo.findByIdWithParticipants.mockRejectedValueOnce(
        new Error("Reschedule Mail Error"),
      );
      const result = await service.rescheduleSlot({
        connectRequestId: "id",
        slotIndex: "0",
        date: "2026-07-08",
        startTime: "11:00",
        endTime: "12:00",
        userId: "u_id",
      });
      expect(result.newSlotIndex).toBe(1);
      await Promise.resolve();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ── getMentorAvailability Pipeline ──────────────────────────────────────
  describe("getMentorAvailability Pipeline", () => {
    test("should extract provider schedules or apply global platform fallback structures", async () => {
      const req = buildBaseRequest();
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      mockAvailabilityRepo.findAvailabilityByMentor.mockResolvedValueOnce(null);
      let result = await service.getMentorAvailability("id", 60, "u_id");
      expect(result.slots).toEqual([]);

      // COVERAGE FOR LINES: Force fallback evaluations for missing availability properties (|| fallback values)
      mockAvailabilityRepo.findAvailabilityByMentor.mockResolvedValueOnce({
        specificDates: [],
        weeklyHours: [],
      });
      result = await service.getMentorAvailability("id", 60, "m_id");
      expect(result.timezone).toBe("Asia/Kolkata");
      expect(result.sessionDurations).toEqual([30, 60]);
    });
  });

  // ── Communication Isolation ─────────────────────────────────────────────
  describe("Communication Isolation Fallbacks", () => {
    test("should trap socket exceptions inside helper routines safely without crashing execution loops", async () => {
      const req = buildBaseRequest();
      req.selectedSlots = [
        { status: "booked", menteeMarked: false, mentorMarked: false },
      ];
      mockConnectRepo.findByIdRaw.mockResolvedValue(req);
      mockSocket.emitToUser.mockImplementation(() => {
        throw new Error("Socket disconnected");
      });

      await service.cancelSlot({
        connectRequestId: "id",
        slotIndex: "0",
        reason: "x",
        userId: "m_id",
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "emitToOther failed",
        expect.any(Object),
      );

      // COVERAGE FOR LINES: Empty/missing socket handler functionality bypass block
      const silentService = createSessionService({
        mongoose: { startSession: jest.fn() },
        connectRequestRepo: mockConnectRepo,
        availabilityRepo: mockAvailabilityRepo,
        escrowService: mockEscrowService,
        releaseEscrow: mockReleaseEscrow,
        socketHandler: {},
        emailUtils: mockEmailUtils,
        generateAvailableSlots: mockGenerateSlots,
        logger: mockLogger,
      });
      req.selectedSlots = [{ meetingLink: "" }];
      await expect(
        silentService.setMeetingLink({
          connectRequestId: "id",
          slotIndex: "0",
          meetingLink: "https://zoom.us/abc",
          userId: "m_id",
        }),
      ).resolves.toBeDefined();
    });
  });
});
