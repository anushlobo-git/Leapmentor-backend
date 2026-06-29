/**
 * @fileoverview Complete Domain Unit Tests Suite for Slot Lock Service Module
 * @description Secures 100% statement, branch, function, and line execution coverage patterns.
 */

const createSlotLockService = require("../../../services/slotLock.service");
const AppError = require("../../../utils/AppError");

describe("Slot Lock Service Unit Tests", () => {
  let mockLockRepo, mockConnectRepo, mockMapper, service;

  const mockMenteeId = "mentee_alice_123";
  const mockMentorId = "mentor_bob_456";
  const targetDate = "2026-10-12";

  beforeEach(() => {
    mockLockRepo = {
      findActiveLocksByMentorAndDate: jest.fn(),
      upsertSlotLock: jest.fn(),
      deleteOneLock: jest.fn(),
      deleteManyLocks: jest.fn(),
      findActiveLocksExcludingUser: jest.fn(),
    };
    mockConnectRepo = {
      findBookedRequestsByMentor: jest.fn(),
    };
    mockMapper = jest.fn((val) => val);

    // Instantiate using the correct named parameter configuration interface matching the source
    service = createSlotLockService({
      slotLockRepository: mockLockRepo,
      connectRequestRepository: mockConnectRepo,
      toSlotLockDTO: mockMapper,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("acquireSlotLock Core Scheduling Guardrails", () => {
    test("should throw a 400 bad request error if mandatory parameter properties are missing", async () => {
      await expect(
        service.acquireSlotLock(mockMenteeId, { mentorId: mockMentorId }),
      ).rejects.toThrow(
        new AppError(
          "Missing required parameter elements inside input fields maps",
          400,
        ),
      );
    });

    test("should skip evaluation logic if permanent booking entries map to completely different dates", async () => {
      const distinctDateBooking = [
        {
          selectedSlots: [
            { date: "2026-12-25", startTime: "09:00", endTime: "10:00" },
          ],
        },
      ];
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue(
        distinctDateBooking,
      );
      mockLockRepo.findActiveLocksByMentorAndDate.mockResolvedValue([]);

      const fields = {
        mentorId: mockMentorId,
        date: targetDate,
        startTime: "09:00",
        endTime: "10:00",
      };
      const result = await service.acquireSlotLock(mockMenteeId, fields);

      expect(mockLockRepo.upsertSlotLock).toHaveBeenCalled();
      expect(result.lockedFor).toBe(10);
    });

    test("should evaluate and support alternative data layouts utilizing the single selectedSlot fallback branch", async () => {
      const fallbackDataShapeBooking = [
        {
          selectedSlot: {
            date: targetDate,
            startTime: "09:30",
            endTime: "10:30",
          },
          selectedSlots: null,
        },
      ];
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue(
        fallbackDataShapeBooking,
      );

      const fields = {
        mentorId: mockMentorId,
        date: targetDate,
        startTime: "09:00",
        endTime: "10:00",
      };
      await expect(
        service.acquireSlotLock(mockMenteeId, fields),
      ).rejects.toThrow(
        expect.objectContaining({ statusCode: 409, code: "SLOT_BOOKED" }),
      );
    });

    test("should trigger an intentional 409 conflict exception code SLOT_BOOKED when timelines intersect permanent nodes", async () => {
      const permanentOverlapBooking = [
        {
          selectedSlots: [
            { date: targetDate, startTime: "09:45", endTime: "10:45" },
          ],
        },
      ];
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue(
        permanentOverlapBooking,
      );

      const fields = {
        mentorId: mockMentorId,
        date: targetDate,
        startTime: "09:00",
        endTime: "10:00",
      };
      await expect(
        service.acquireSlotLock(mockMenteeId, fields),
      ).rejects.toThrow(
        expect.objectContaining({ statusCode: 409, code: "SLOT_BOOKED" }),
      );
    });

    test("should ignore temporary locking collisions when evaluating a hold previously placed by the same checking-out user", async () => {
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue([]);
      const selfActiveLock = [
        { lockedBy: mockMenteeId, startTime: "09:00", endTime: "10:00" },
      ];
      mockLockRepo.findActiveLocksByMentorAndDate.mockResolvedValue(
        selfActiveLock,
      );

      const fields = {
        mentorId: mockMentorId,
        date: targetDate,
        startTime: "09:00",
        endTime: "10:00",
      };
      const result = await service.acquireSlotLock(mockMenteeId, fields);

      expect(mockLockRepo.upsertSlotLock).toHaveBeenCalled();
      expect(result).toHaveProperty("expiresAt");
    });

    test("should throw 409 exception code SLOT_LOCKED if a competing concurrency lock spans across the requested time frame", async () => {
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue([]);
      const foreignActiveLock = [
        {
          lockedBy: "competing_mentee_uuid",
          startTime: "09:30",
          endTime: "10:30",
        },
      ];
      mockLockRepo.findActiveLocksByMentorAndDate.mockResolvedValue(
        foreignActiveLock,
      );

      const fields = {
        mentorId: mockMentorId,
        date: targetDate,
        startTime: "09:00",
        endTime: "10:00",
      };
      await expect(
        service.acquireSlotLock(mockMenteeId, fields),
      ).rejects.toThrow(
        expect.objectContaining({ statusCode: 409, code: "SLOT_LOCKED" }),
      );
    });

    test("should successfully write backend temporary checkout constraints when all target avenues resolve clear", async () => {
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue([]);
      mockLockRepo.findActiveLocksByMentorAndDate.mockResolvedValue([]);

      const fields = {
        mentorId: mockMentorId,
        date: targetDate,
        startTime: "14:00",
        endTime: "15:00",
      };
      const result = await service.acquireSlotLock(mockMenteeId, fields);

      expect(mockLockRepo.upsertSlotLock).toHaveBeenCalledWith(
        expect.objectContaining({
          mentorId: mockMentorId,
          date: targetDate,
          lockedBy: mockMenteeId,
        }),
        expect.any(Date),
      );
      expect(result.lockedFor).toBe(10);
    });
  });

  describe("releaseSlotLock Document Eviction Pipelines", () => {
    test("should trigger 400 bad request error properties if parameters drop below configuration demands", async () => {
      await expect(
        service.releaseSlotLock(mockMenteeId, { date: targetDate }),
      ).rejects.toThrow(
        new AppError(
          "Missing required parameter elements inside input fields maps",
          400,
        ),
      );
    });

    test("should execute target collection removals cleanly upon providing structured coordinates mappings", async () => {
      const fields = {
        mentorId: mockMentorId,
        date: targetDate,
        startTime: "09:00",
        endTime: "10:00",
      };
      await service.releaseSlotLock(mockMenteeId, fields);

      expect(mockLockRepo.deleteOneLock).toHaveBeenCalledWith(
        expect.objectContaining({
          mentorId: mockMentorId,
          date: targetDate,
          lockedBy: mockMenteeId,
        }),
      );
    });
  });

  describe("releaseAllUserLocks Context Mass Resets", () => {
    test("should build deletion queries scoping the mentor filter when the identity coordinate is populated", async () => {
      await service.releaseAllUserLocks(mockMenteeId, mockMentorId);
      expect(mockLockRepo.deleteManyLocks).toHaveBeenCalledWith({
        lockedBy: mockMenteeId,
        mentorId: mockMentorId,
      });
    });

    test("should drop mentor boundaries from deletion objects when the parameter identifier arrives missing", async () => {
      await service.releaseAllUserLocks(mockMenteeId, null);
      expect(mockLockRepo.deleteManyLocks).toHaveBeenCalledWith({
        lockedBy: mockMenteeId,
      });
    });
  });

  describe("getMentorActiveLocksList Verification", () => {
    test("should delegate query lookups downstream and accurately structure DTO array maps payloads", async () => {
      const rawLocks = [
        { id: "l1", startTime: "11:00" },
        { id: "l2", startTime: "12:00" },
      ];
      mockLockRepo.findActiveLocksExcludingUser.mockResolvedValue(rawLocks);

      const result = await service.getMentorActiveLocksList(
        mockMentorId,
        mockMenteeId,
      );

      expect(mockLockRepo.findActiveLocksExcludingUser).toHaveBeenCalledWith(
        mockMentorId,
        mockMenteeId,
      );
      expect(mockMapper).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ locks: rawLocks });
    });
  });
});
