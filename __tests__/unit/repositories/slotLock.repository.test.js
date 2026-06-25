/**
 * @fileoverview Slot Lock Repository Unit Tests
 * @description Assures valid filter execution configurations, serialization checks,
 * and atomic modification chains using isolated driver model stubs.
 */

const createSlotLockRepository = require("../../../repositories/slotLock.repository");

describe("Slot Lock Repository Unit Tests", () => {
  let mockModel;
  let repository;

  // Helper factory to emulate chainable Mongoose .lean() query targets
  const createQueryChainMock = (resolvedValue) => ({
    lean: jest.fn().mockResolvedValue(resolvedValue),
  });

  beforeEach(() => {
    mockModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      deleteMany: jest.fn(),
    };
    repository = createSlotLockRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findActiveLocksByMentor Pipeline Execution", () => {
    test("should fetch filtered records and invoke lean serialization stripping Mongoose wrappers", async () => {
      const mockResult = [{ _id: "lock_1" }];
      const chainMock = createQueryChainMock(mockResult);
      mockModel.find.mockReturnValue(chainMock);

      const result = await repository.findActiveLocksByMentor(
        "mentor_123",
        "user_456",
      );

      expect(mockModel.find).toHaveBeenCalledWith({
        mentorId: "mentor_123",
        lockedBy: { $ne: "user_456" },
      });
      expect(chainMock.lean).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe("findActiveLocksByMentorAndDate Mapping Checks", () => {
    test("should extract short-term holds targeting a single unique calendar date string", async () => {
      const mockResult = [{ _id: "lock_2" }];
      const chainMock = createQueryChainMock(mockResult);
      mockModel.find.mockReturnValue(chainMock);

      const result = await repository.findActiveLocksByMentorAndDate(
        "mentor_789",
        "2026-06-24",
      );

      expect(mockModel.find).toHaveBeenCalledWith({
        mentorId: "mentor_789",
        date: "2026-06-24",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("upsertSlotLock Concurrency Actions", () => {
    test("should trigger atomic set updates while enforcing creation rules if unallocated", async () => {
      const mockResult = {
        _id: "lock_3",
        expiresAt: "2026-06-24T12:00:00.000Z",
      };
      const chainMock = createQueryChainMock(mockResult);
      mockModel.findOneAndUpdate.mockReturnValue(chainMock);

      const criteria = { mentorId: "m1", date: "2026-06-24" };
      const expiry = new Date("2026-06-24T12:00:00.000Z");
      const result = await repository.upsertSlotLock(criteria, expiry);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        criteria,
        { $set: { expiresAt: expiry } },
        { upsert: true, new: true },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("Single and Bulk Purging Transactions", () => {
    test("deleteOneLock should target a single query intersection point", async () => {
      mockModel.findOneAndDelete.mockResolvedValue({ _id: "deleted_lock" });

      const criteria = { _id: "lock_target_99" };
      const result = await repository.deleteOneLock(criteria);

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith(criteria);
      expect(result).toEqual({ _id: "deleted_lock" });
    });

    test("deleteManyLocks should pass criteria structural logs to atomic multi-removal actions", async () => {
      const mockSummary = { deletedCount: 5 };
      mockModel.deleteMany.mockResolvedValue(mockSummary);

      const filter = { mentorId: "mentor_stale_data" };
      const result = await repository.deleteManyLocks(filter);

      expect(mockModel.deleteMany).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockSummary);
    });
  });

  describe("findActiveLocksExcludingUser Fallback Alias", () => {
    test("should match standard parameters filtering requesting user identity profiles", async () => {
      const mockResult = [];
      const chainMock = createQueryChainMock(mockResult);
      mockModel.find.mockReturnValue(chainMock);

      const result = await repository.findActiveLocksExcludingUser(
        "m_id",
        "u_id",
      );

      expect(mockModel.find).toHaveBeenCalledWith({
        mentorId: "m_id",
        lockedBy: { $ne: "u_id" },
      });
      expect(result).toEqual(mockResult);
    });
  });
});
