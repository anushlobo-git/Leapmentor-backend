/**
 * @fileoverview Slot Lock Repository Corporate Unit Tests
 * @description Assures precise verification of timing lock boundaries, exclusion criteria,
 * atomic upsert wrappers, and bulk cleanup routines with zero network access.
 */

const createSlotLockRepository = require("../../../repositories/slotLock.repository");

describe("SlotLock Repository", () => {
  let mockSlotLockModel;
  let slotLockRepository;

  const mockLockRecord = {
    _id: "lock123",
    mentorId: "mentor777",
    lockedBy: "user888",
    date: "2026-07-15",
    startTime: "10:00",
    endTime: "11:00",
    expiresAt: new Date("2026-06-29T14:30:00.000Z"),
  };

  const mockRecordsArray = [mockLockRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockSlotLockModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      deleteMany: jest.fn(),
    };
    slotLockRepository = createSlotLockRepository(mockSlotLockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── ACTIVE LOCK LOOKUPS ─────────────────────────────────────────────────
  describe("Active Lock Lookups", () => {
    test("findActiveLocksByMentor should query short-term locks filtering out the active user exclusions", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockSlotLockModel.find.mockReturnValue(mockChain);

      const result = await slotLockRepository.findActiveLocksByMentor(
        "mentor777",
        "user888",
      );

      expect(mockSlotLockModel.find).toHaveBeenCalledWith({
        mentorId: "mentor777",
        lockedBy: { $ne: "user888" },
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findActiveLocksByMentorAndDate should narrow queries down to specific target calendar dates", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockSlotLockModel.find.mockReturnValue(mockChain);

      const result = await slotLockRepository.findActiveLocksByMentorAndDate(
        "mentor777",
        "2026-07-15",
      );

      expect(mockSlotLockModel.find).toHaveBeenCalledWith({
        mentorId: "mentor777",
        date: "2026-07-15",
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });

    test("findActiveLocksExcludingUser should properly execute user exclusion criteria queries mapping lean formats", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockSlotLockModel.find.mockReturnValue(mockChain);

      const result = await slotLockRepository.findActiveLocksExcludingUser(
        "mentor777",
        "user888",
      );

      expect(mockSlotLockModel.find).toHaveBeenCalledWith({
        mentorId: "mentor777",
        lockedBy: { $ne: "user888" },
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── ATOMIC DATA MUTATIONS & WRITES ──────────────────────────────────────
  describe("Atomic Data Mutations & Writes", () => {
    test("upsertSlotLock should invoke atomic findAndModify overrides enforcing strict setup flags", async () => {
      const mockChain = makeChain(mockLockRecord);
      mockSlotLockModel.findOneAndUpdate.mockReturnValue(mockChain);
      const criteria = {
        mentorId: "mentor777",
        date: "2026-07-15",
        startTime: "10:00",
      };
      const expirationDate = new Date("2026-06-29T14:30:00.000Z");

      const result = await slotLockRepository.upsertSlotLock(
        criteria,
        expirationDate,
      );

      expect(mockSlotLockModel.findOneAndUpdate).toHaveBeenCalledWith(
        criteria,
        { $set: { expiresAt: expirationDate } },
        { upsert: true, new: true },
      );
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockLockRecord);
    });
  });

  // ── REMOVALS & LOCK PURGES ──────────────────────────────────────────────
  describe("Removals & Lock Purges", () => {
    test("deleteOneLock should pinpoint and drop singular transaction holds natively", async () => {
      mockSlotLockModel.findOneAndDelete.mockResolvedValue(mockLockRecord);
      const criteria = { _id: "lock123", lockedBy: "user888" };

      const result = await slotLockRepository.deleteOneLock(criteria);

      expect(mockSlotLockModel.findOneAndDelete).toHaveBeenCalledWith(criteria);
      expect(result).toEqual(mockLockRecord);
    });

    test("deleteManyLocks should execute direct batch scrubs matching global filter criteria block payloads", async () => {
      mockSlotLockModel.deleteMany.mockResolvedValue({ deletedCount: 5 });
      const purgeFilter = { mentorId: "mentor777" };

      const result = await slotLockRepository.deleteManyLocks(purgeFilter);

      expect(mockSlotLockModel.deleteMany).toHaveBeenCalledWith(purgeFilter);
      expect(result).toEqual({ deletedCount: 5 });
    });
  });
});
