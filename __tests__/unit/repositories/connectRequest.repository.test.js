/**
 * @fileoverview ConnectRequest Repository Corporate Unit Tests
 * @description Thoroughly verifies Mongoose criteria parsing, pipeline chaining parameters,
 * pagination controls, and model mutation routines using mock environments.
 */

const createConnectRequestRepository = require("../../../repositories/connectRequest.repository");

describe("ConnectRequest Repository", () => {
  let mockModel;
  let repository;
  let mockSession;

  const mockRecord = {
    _id: "req123",
    mentee: "userA",
    mentor: "userB",
    status: "pending",
  };
  const mockRecordsArray = [mockRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.select = jest.fn().mockReturnValue(promise);
    promise.session = jest.fn().mockReturnValue(promise);
    promise.skip = jest.fn().mockReturnValue(promise);
    promise.limit = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateMany: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      deleteMany: jest.fn(),
    };
    mockSession = { id: "tx_session_777" };
    repository = createConnectRequestRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── BASIC LOOKUPS & WRITE OPERATIONS ────────────────────────────────────
  describe("Basic Lookups & Write Operations", () => {
    test("findPendingRequest matches fields cleanly", async () => {
      mockModel.findOne.mockResolvedValue(mockRecord);
      const res = await repository.findPendingRequest("userA", "userB");
      expect(mockModel.findOne).toHaveBeenCalledWith({
        mentee: "userA",
        mentor: "userB",
        status: "pending",
      });
      expect(res).toEqual(mockRecord);
    });

    test("findSlotConflict locates timeline updates inside validation subsets", async () => {
      mockModel.findOne.mockResolvedValue(mockRecord);
      const slot = { date: "2026-07-01", startTime: "10:00", endTime: "11:00" };
      await repository.findSlotConflict("userB", slot);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        mentor: "userB",
        status: { $in: ["pending", "accepted"] },
        "selectedSlots.date": slot.date,
        "selectedSlots.startTime": slot.startTime,
        "selectedSlots.endTime": slot.endTime,
      });
    });

    test("createConnectRequest instantiates documents immediately", async () => {
      mockModel.create.mockResolvedValue(mockRecord);
      await repository.createConnectRequest({ payload: true });
      expect(mockModel.create).toHaveBeenCalledWith({ payload: true });
    });

    test("findById strips metadata schemas using lean evaluation", async () => {
      const chain = makeChain(mockRecord);
      mockModel.findById.mockReturnValue(chain);
      await repository.findById("req123");
      expect(mockModel.findById).toHaveBeenCalledWith("req123");
      expect(chain.lean).toHaveBeenCalled();
    });

    test("findByIdRaw ties lifecycle queries alongside active contexts", async () => {
      const chain = makeChain(mockRecord);
      mockModel.findById.mockReturnValue(chain);
      await repository.findByIdRaw("req123", mockSession);
      expect(chain.session).toHaveBeenCalledWith(mockSession);
    });

    test("deleteRequestById triggers drop commands accurately", async () => {
      mockModel.findByIdAndDelete.mockResolvedValue(mockRecord);
      await repository.deleteRequestById("req123");
      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith("req123");
    });

    test("saveRequest calls explicit save properties internally", async () => {
      const fakeDoc = { save: jest.fn().mockResolvedValue(true) };
      await repository.saveRequest(fakeDoc);
      expect(fakeDoc.save).toHaveBeenCalled();
    });

    test("save forwards transaction tokens disabling validation bypasses", async () => {
      const fakeDoc = { save: jest.fn().mockResolvedValue(true) };
      await repository.save(fakeDoc, mockSession);
      expect(fakeDoc.save).toHaveBeenCalledWith({
        session: mockSession,
        validateBeforeSave: false,
      });
    });
  });

  // ── PARTICIPANT POPULATED PIPELINES ─────────────────────────────────────
  describe("Participant Populated Pipelines", () => {
    test("findByIdWithParticipants hooks structural subdocuments", async () => {
      const chain = makeChain(mockRecord);
      mockModel.findById.mockReturnValue(chain);
      await repository.findByIdWithParticipants("req123", mockSession);
      expect(chain.populate).toHaveBeenCalledWith("mentee", "name email");
      expect(chain.populate).toHaveBeenCalledWith("mentor", "name email");
      expect(chain.session).toHaveBeenCalledWith(mockSession);
    });

    test("findByIdWithParticipantsLean maps configurations into read-only targets", async () => {
      const chain = makeChain(mockRecord);
      mockModel.findById.mockReturnValue(chain);
      await repository.findByIdWithParticipantsLean("req123");
      expect(chain.lean).toHaveBeenCalled();
    });

    test("findMyRequests fetches client history sorted sequentially", async () => {
      const chain = makeChain(mockRecordsArray);
      mockModel.find.mockReturnValue(chain);
      await repository.findMyRequests("userA");
      expect(mockModel.find).toHaveBeenCalledWith({ mentee: "userA" });
      expect(chain.sort).toHaveBeenCalledWith({ requestedAt: -1 });
    });

    test("findIncomingRequests enforces optional explicit query parameter restrictions", async () => {
      const chain = makeChain(mockRecordsArray);
      mockModel.find.mockReturnValue(chain);

      await repository.findIncomingRequests("userB", "pending");
      expect(mockModel.find).toHaveBeenCalledWith({
        mentor: "userB",
        status: "pending",
      });

      await repository.findIncomingRequests("userB", "invalid_status");
      expect(mockModel.find).toHaveBeenCalledWith({ mentor: "userB" });
    });

    test("findOngoingConnects gathers matching matrix frameworks", async () => {
      const chain = makeChain(mockRecordsArray);
      mockModel.find.mockReturnValue(chain);
      await repository.findOngoingConnects("userA");
      expect(mockModel.find).toHaveBeenCalledWith({
        status: { $in: ["ongoing", "completed"] },
        $or: [{ mentee: "userA" }, { mentor: "userA" }],
      });
    });
  });

  // ── QUANTIFIED COUNTERS & AGGREGATIONS ──────────────────────────────────
  describe("Quantified Counters & Aggregations", () => {
    test("countByStatus evaluates singular operational profiles", async () => {
      mockModel.countDocuments.mockResolvedValue(5);
      const count = await repository.countByStatus("completed");
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        status: "completed",
      });
      expect(count).toBe(5);
    });

    test("countByFilter maps distinct parameters downstream", async () => {
      mockModel.countDocuments.mockResolvedValue(12);
      await repository.countByFilter({ specialFlag: true });
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        specialFlag: true,
      });
    });

    test("countRefundedRequests tracks billing reversals", async () => {
      mockModel.countDocuments.mockResolvedValue(1);
      await repository.countRefundedRequests();
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        paymentStatus: "refunded",
      });
    });

    test("countCompletedSessionsByUser matches wide scopes cleanly", async () => {
      mockModel.countDocuments.mockResolvedValue(8);
      await repository.countCompletedSessionsByUser("userA");
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        $or: [{ mentor: "userA" }, { mentee: "userA" }],
        status: "completed",
      });
    });

    test("deleteManyByUser clears multiple documents across entities", async () => {
      mockModel.deleteMany.mockResolvedValue({ deletedCount: 3 });
      await repository.deleteManyByUser("userA");
      expect(mockModel.deleteMany).toHaveBeenCalledWith({
        $or: [{ mentor: "userA" }, { mentee: "userA" }],
      });
    });
  });

  // ── PAGINATION, FINANCIALS & SELECTION RULES ────────────────────────────
  describe("Pagination, Financials & Selection Rules", () => {
    test("findEngagements applies skip and limit variables smoothly", async () => {
      const chain = makeChain(mockRecordsArray);
      mockModel.find.mockReturnValue(chain);
      await repository.findEngagements(
        { status: "active" },
        { skip: 10, limit: 5 },
      );
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(5);
    });

    test("findCompletedPaidSessions checks baseline thresholds", async () => {
      const chain = makeChain([]);
      mockModel.find.mockReturnValue(chain);
      await repository.findCompletedPaidSessions();
      expect(mockModel.find).toHaveBeenCalledWith({
        status: "completed",
        paymentStatus: "paid",
        totalAmount: { $gt: 0 },
      });
      expect(chain.select).toHaveBeenCalledWith("totalAmount commissionAmount");
    });

    test("findSessionsByMonth segments schedules using bounds arrays", async () => {
      const chain = makeChain([]);
      mockModel.find.mockReturnValue(chain);
      await repository.findSessionsByMonth("start", "end");
      expect(mockModel.find).toHaveBeenCalledWith({
        status: "completed",
        completedAt: { $gte: "start", $lt: "end" },
      });
    });

    test("findPayoutHistory maps financial tracking structures safely", async () => {
      const chain = makeChain([]);
      mockModel.find.mockReturnValue(chain);
      await repository.findPayoutHistory(
        { mentor: "m1" },
        { skip: 0, limit: 10 },
      );
      expect(chain.select).toHaveBeenCalledWith(
        "completedAt totalAmount paymentStatus confirmedSlot mentee",
      );
    });
  });

  // ── MUTATIONS, CONFLICT RESILIENCY & AD-HOC FILTERS ─────────────────────
  describe("Mutations, Conflict Resiliency & Ad-hoc Filters", () => {
    test("rejectConflictingSlots cancels secondary overlapping targets", async () => {
      mockModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
      const confirmedSlot = {
        date: "2026-07-02",
        startTime: "14:00",
        endTime: "15:00",
      };

      await repository.rejectConflictingSlots("req123", "userB", confirmedSlot);
      expect(mockModel.updateMany).toHaveBeenCalledWith(
        {
          _id: { $ne: "req123" },
          mentor: "userB",
          status: "pending",
          "selectedSlots.date": confirmedSlot.date,
          "selectedSlots.startTime": confirmedSlot.startTime,
          "selectedSlots.endTime": confirmedSlot.endTime,
        },
        expect.objectContaining({
          $set: expect.objectContaining({ status: "rejected" }),
        }),
      );
    });

    test("findBookedRequestsByMentor restricts projections tightly", async () => {
      const chain = makeChain([]);
      mockModel.find.mockReturnValue(chain);
      await repository.findBookedRequestsByMentor("userB");
      expect(mockModel.find).toHaveBeenCalledWith(
        {
          mentor: "userB",
          status: { $in: ["pending", "accepted", "ongoing"] },
        },
        { selectedSlots: 1, selectedSlot: 1 },
      );
    });

    test("findByIdForFeedback filters down targeted layout requirements", async () => {
      const chain = makeChain(mockRecord);
      mockModel.findById.mockReturnValue(chain);
      await repository.findByIdForFeedback("req123");
      expect(chain.select).toHaveBeenCalledWith(
        "mentor mentee status selectedSlots",
      );
    });

    test("findByIdWithMentorId limits parameter projections", async () => {
      const chain = makeChain(mockRecord);
      mockModel.findById.mockReturnValue(chain);
      await repository.findByIdWithMentorId("req123");
      expect(chain.select).toHaveBeenCalledWith("mentor status");
    });
  });
});
