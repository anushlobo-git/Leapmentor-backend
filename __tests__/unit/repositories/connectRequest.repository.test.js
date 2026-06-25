/**
 * @fileoverview ConnectRequest Repository Corporate Unit Tests
 * @description Verifies query builder pipelines, transaction sessions, and
 * filter boundaries using optimized mock chains.
 */

const createConnectRequestRepository = require("../../../repositories/connectRequest.repository");

describe("ConnectRequest Repository", () => {
  let mockModel;
  let repository;

  const mockRecord = {
    _id: "req123",
    mentor: "m1",
    mentee: "u1",
    status: "pending",
  };

  const makeChain = (resolvedValue = null) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
  });

  beforeEach(() => {
    mockModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      deleteMany: jest.fn(),
    };
    repository = createConnectRequestRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findPendingRequest", () => {
    test("should look up record with pending state explicitly", async () => {
      mockModel.findOne.mockResolvedValue(mockRecord);
      const result = await repository.findPendingRequest("u1", "m1");
      expect(mockModel.findOne).toHaveBeenCalledWith({
        mentee: "u1",
        mentor: "m1",
        status: "pending",
      });
      expect(result).toEqual(mockRecord);
    });

    test("should return null when no pending match exists", async () => {
      mockModel.findOne.mockResolvedValue(null);
      const result = await repository.findPendingRequest("u2", "m2");
      expect(result).toBeNull();
    });
  });

  describe("findSlotConflict", () => {
    test("should cross-reference accurate scheduling values", async () => {
      mockModel.findOne.mockResolvedValue(mockRecord);
      const slot = { date: "2026-06-25", startTime: "14:00", endTime: "15:00" };

      const result = await repository.findSlotConflict("m1", slot);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        mentor: "m1",
        status: { $in: ["pending", "accepted"] },
        "selectedSlots.date": "2026-06-25",
        "selectedSlots.startTime": "14:00",
        "selectedSlots.endTime": "15:00",
      });
      expect(result).toEqual(mockRecord);
    });
  });

  describe("findById", () => {
    test("should invoke a lean findById operation directly", async () => {
      const chain = makeChain(mockRecord);
      mockModel.findById.mockReturnValue(chain);

      const result = await repository.findById("req123");
      expect(mockModel.findById).toHaveBeenCalledWith("req123");
      expect(chain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecord);
    });
  });

  describe("findIncomingRequests", () => {
    test("should pass whitelist status variables unmodified", async () => {
      const chain = makeChain([mockRecord]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findIncomingRequests("m1", "referred");
      expect(mockModel.find).toHaveBeenCalledWith({
        mentor: "m1",
        status: "referred",
      });
      expect(result).toEqual([mockRecord]);
    });

    test("should bypass invalid status parameters seamlessly", async () => {
      const chain = makeChain([mockRecord]);
      mockModel.find.mockReturnValue(chain);

      await repository.findIncomingRequests("m1", "invalid_enum_val");
      expect(mockModel.find).toHaveBeenCalledWith({ mentor: "m1" });
    });
  });

  describe("rejectConflictingSlots", () => {
    test("should safely execute a batch update configuration", async () => {
      mockModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
      const confirmedSlot = {
        date: "2026-06-23",
        startTime: "09:00",
        endTime: "10:00",
      };

      const result = await repository.rejectConflictingSlots(
        "req123",
        "m1",
        confirmedSlot,
      );

      expect(mockModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $ne: "req123" },
          mentor: "m1",
          status: "pending",
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: "rejected" }),
        }),
      );
      expect(result.modifiedCount).toBe(2);
    });
  });

  describe("findEngagements", () => {
    test("should implement layout boundary arguments flawlessly", async () => {
      const chain = makeChain([mockRecord]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findEngagements(
        { status: "accepted" },
        { skip: 15, limit: 15 },
      );

      expect(mockModel.find).toHaveBeenCalledWith({ status: "accepted" });
      expect(chain.skip).toHaveBeenCalledWith(15);
      expect(chain.limit).toHaveBeenCalledWith(15);
      expect(result).toEqual([mockRecord]);
    });
  });

  describe("save", () => {
    test("should leverage direct save bypasses with runtime sessions attached", async () => {
      const mockDoc = { save: jest.fn().mockResolvedValue(mockRecord) };
      const result = await repository.save(mockDoc, "session_context_id");

      expect(mockDoc.save).toHaveBeenCalledWith({
        session: "session_context_id",
        validateBeforeSave: false,
      });
      expect(result).toEqual(mockRecord);
    });
  });
});
