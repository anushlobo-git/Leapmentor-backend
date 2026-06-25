/**
 * @fileoverview Session Management Logic Unit Tests
 * @description Validates structural ownership markers, Trusted link filters,
 * multi-party consensus locks, and exception routing completely in-memory.
 */

const createSessionService = require("../../../services/session.service");
const AppError = require("../../../utils/AppError");

describe("Session Stateless Domain Service Unit Tests", () => {
  let mockMongoose,
    mockConnectRepo,
    mockAvailabilityRepo,
    mockEscrowService,
    mockReleaseEscrow,
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
      findByIdWithParticipants: jest.fn(),
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

    service = createSessionService(
      mockMongoose,
      mockConnectRepo,
      mockAvailabilityRepo,
      mockEscrowService,
      mockReleaseEscrow,
      mockSocket,
      mockEmailUtils,
      mockGenerateSlots,
      mockLogger,
    );
  });

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
        userId: "u_id", // acting mentee
      });

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockRequest.selectedSlots[0].menteeMarked).toBe(true);
      expect(mockRequest.selectedSlots[0].mentorMarked).toBe(false);
      expect(result.bothMarked).toBe(false);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });
});
