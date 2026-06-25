/**
 * @fileoverview Slot Lock Domain Service Unit Tests
 * @description Validates timeline conversion arithmetic, permanent booking blockers,
 * temporary lock collision rejections, and extension allowances.
 */

const createSlotLockService = require("../../../services/slotLock.service");
const AppError = require("../../../utils/AppError");

describe("Slot Lock Service Unit Tests", () => {
  let mockLockRepo, mockConnectRepo, mockMapper, service;

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

    service = createSlotLockService(mockLockRepo, mockConnectRepo, mockMapper);
  });

  describe("acquireSlotLock Multi-Layer Collision Engine", () => {
    test("should successfully write back temporary checkouts when paths are clear of permanent or short-term overlaps", async () => {
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue([]);
      mockLockRepo.findActiveLocksByMentorAndDate.mockResolvedValue([]);

      const result = await service.acquireSlotLock("mentee_uuid_alice", {
        mentorId: "mentor_uuid_bob",
        date: "2026-10-12",
        startTime: "09:00",
        endTime: "10:00",
      });

      expect(mockLockRepo.upsertSlotLock).toHaveBeenCalled();
      expect(result.lockedFor).toBe(10);
      expect(result).toHaveProperty("expiresAt");
    });

    test("should fail with a 409 exception code SLOT_BOOKED if a permanent request booking occupies the target slot", async () => {
      const mockBooked = [
        {
          selectedSlots: [
            { date: "2026-10-12", startTime: "09:30", endTime: "10:30" },
          ],
        },
      ];
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue(mockBooked);

      await expect(
        service.acquireSlotLock("mentee_uuid_alice", {
          mentorId: "mentor_uuid_bob",
          date: "2026-10-12",
          startTime: "09:00",
          endTime: "10:00",
        }),
      ).rejects.toThrow(
        expect.objectContaining({ statusCode: 409, code: "SLOT_BOOKED" }),
      );
    });

    test("should fail with a 409 exception code SLOT_LOCKED if a concurrent mentee holds an unexpired checkout timer over the window", async () => {
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue([]);

      const mockActiveLocks = [
        {
          lockedBy: "mentee_uuid_charlie",
          startTime: "08:45",
          endTime: "09:15",
        },
      ];
      mockLockRepo.findActiveLocksByMentorAndDate.mockResolvedValue(
        mockActiveLocks,
      );

      await expect(
        service.acquireSlotLock("mentee_uuid_alice", {
          mentorId: "mentor_uuid_bob",
          date: "2026-10-12",
          startTime: "09:00",
          endTime: "10:00",
        }),
      ).rejects.toThrow(
        expect.objectContaining({ statusCode: 409, code: "SLOT_LOCKED" }),
      );
    });

    test("should permit request extensions if the holding mentee id matches the lock owner identity tracking token", async () => {
      mockConnectRepo.findBookedRequestsByMentor.mockResolvedValue([]);

      // Self-ownership check matching mentee_uuid_alice shouldn't reject the extension request loop
      const mockActiveLocks = [
        { lockedBy: "mentee_uuid_alice", startTime: "08:45", endTime: "09:15" },
      ];
      mockLockRepo.findActiveLocksByMentorAndDate.mockResolvedValue(
        mockActiveLocks,
      );

      const result = await service.acquireSlotLock("mentee_uuid_alice", {
        mentorId: "mentor_uuid_bob",
        date: "2026-10-12",
        startTime: "09:00",
        endTime: "10:00",
      });

      expect(mockLockRepo.upsertSlotLock).toHaveBeenCalled();
      expect(result.lockedFor).toBe(10);
    });
  });
});
