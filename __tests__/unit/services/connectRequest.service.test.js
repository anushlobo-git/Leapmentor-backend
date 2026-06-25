/**
 * @fileoverview Connection Request Management Service Unit Tests
 * @description Validates structural parameters limits, bulk execution algorithms,
 * context permission errors, and async alerts orchestration entirely in memory.
 */

const createConnectRequestService = require("../../../services/connectRequest.service");

jest.mock("../../../mappers/connectRequest.mapper", () => ({
  toConnectRequestDTO: jest.fn((val) => ({ isRequestDTO: true, ...val })),
}));
jest.mock("../../../mappers/mentorProfile.mapper", () => ({
  toMentorProfileDTO: jest.fn((val) =>
    val ? { isMentorDTO: true, ...val } : null,
  ),
}));
jest.mock("../../../mappers/menteeProfile.mapper", () => ({
  toMenteeProfileDTO: jest.fn((val) =>
    val ? { isMenteeDTO: true, ...val } : null,
  ),
}));

describe("Connection Request Management Service Unit Tests", () => {
  let mockConnectRepo,
    mockMentorRepo,
    mockMenteeRepo,
    mockCreateNotification,
    mockFireAndForgetEmail,
    mockEmailUtils,
    mockSocketService,
    mockLogger,
    service;

  beforeEach(() => {
    mockConnectRepo = {
      findPendingRequest: jest.fn(),
      findSlotConflict: jest.fn(),
      createConnectRequest: jest.fn(),
      findRequestByIdWithMentor: jest.fn(),
      findMyRequests: jest.fn(),
      findIncomingRequests: jest.fn(),
      findByIdWithParticipants: jest.fn(),
      saveRequest: jest.fn(),
      rejectConflictingSlots: jest.fn(),
      findByIdRaw: jest.fn(),
      deleteRequestById: jest.fn(),
      findOngoingConnects: jest.fn(),
      findByIdWithParticipantsLean: jest.fn(),
    };
    mockMentorRepo = {
      findMentorProfilesByUserIds: jest.fn(),
      findMentorProfileFull: jest.fn(),
      findMentorProfile: jest.fn(),
    };
    mockMenteeRepo = {
      findMenteeProfile: jest.fn(),
    };
    mockCreateNotification = jest.fn();
    mockFireAndForgetEmail = jest.fn((fn) => fn());
    mockEmailUtils = {
      sendConnectRequestEmail: jest.fn(),
      sendRequestAcceptedEmail: jest.fn(),
    };
    mockSocketService = {
      emitToUser: jest.fn(),
    };
    mockLogger = { info: jest.fn(), warn: jest.fn() };

    service = createConnectRequestService(
      mockConnectRepo,
      mockMentorRepo,
      mockMenteeRepo,
      mockCreateNotification,
      mockFireAndForgetEmail,
      mockEmailUtils,
      mockSocketService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sendConnectRequestService Edge Cases", () => {
    test("should throw a 400 bad request if slots are missing or violate range rules", async () => {
      const body = { mentorId: "m1", selectedSlots: [] };
      await expect(
        service.sendConnectRequestService("user_123", body, {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "At least one slot must be selected",
      });
    });

    test("should throw a 400 bad request if a client attempts to request themselves", async () => {
      const body = {
        mentorId: "user_123",
        selectedSlots: [
          {
            day: "Mon",
            date: "2026-06-24",
            startTime: "10:00",
            endTime: "11:00",
          },
        ],
      };
      await expect(
        service.sendConnectRequestService("user_123", body, {}),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "You cannot send a request to yourself",
      });
    });

    test("should throw a 409 status conflict error if a conflict exists in the database", async () => {
      mockConnectRepo.findPendingRequest.mockResolvedValue({
        _id: "existing_pending",
      });
      const body = {
        mentorId: "mentor_99",
        selectedSlots: [
          {
            day: "Mon",
            date: "2026-06-24",
            startTime: "10:00",
            endTime: "11:00",
          },
        ],
      };

      await expect(
        service.sendConnectRequestService("user_123", body, {}),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "You already have a pending request with this mentor",
      });
    });
  });

  describe("respondToRequestService Triggers", () => {
    test("should authorize accepted flags, notify targets, emit real-time updates and reject secondary overlaps", async () => {
      const mockRequestDoc = {
        _id: "req_id_123",
        status: "pending",
        mentor: { _id: "mentor_123", name: "Dr. Smith" },
        mentee: { _id: "user_123", name: "Alice", email: "alice@test.com" },
        selectedSlots: [],
      };
      mockConnectRepo.findByIdWithParticipants.mockResolvedValue(
        mockRequestDoc,
      );

      const body = {
        status: "accepted",
        confirmedSlot: {
          date: "2026-06-24",
          startTime: "10:00",
          endTime: "11:00",
        },
      };
      const result = await service.respondToRequestService(
        "req_id_123",
        "mentor_123",
        body,
      );

      expect(mockConnectRepo.saveRequest).toHaveBeenCalled();
      expect(mockConnectRepo.rejectConflictingSlots).toHaveBeenCalled();
      expect(mockCreateNotification).toHaveBeenCalled();
      expect(mockSocketService.emitToUser).toHaveBeenCalledWith(
        "user_123",
        "request_accepted",
        expect.any(Object),
      );
      expect(result.isRequestDTO).toBe(true);
    });

    test("should throw a 403 Forbidden exception if the parsing token matching identity misaligns", async () => {
      mockConnectRepo.findByIdWithParticipants.mockResolvedValue({
        mentor: { _id: "authorized_id" },
      });

      await expect(
        service.respondToRequestService("req_id", "malicious_user", {
          status: "rejected",
        }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
