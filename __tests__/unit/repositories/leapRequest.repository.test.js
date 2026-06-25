/**
 * @fileoverview LeapRequest Repository Corporate Unit Tests
 * @description Verifies sorting evaluation boundaries, model interaction matrices,
 * and promise unwrappers with zero live connection runtime dependencies.
 */

const createLeapRequestRepository = require("../../../repositories/leapRequest.repository");

describe("LeapRequest Repository", () => {
  let mockModel;
  let repository;

  const mockLeapRecord = {
    _id: "leapReq123",
    mentee: "user444",
    status: "pending",
    currentBalance: 250,
    reviewedAt: null,
    reviewedBy: null,
  };

  // Reusable fluent query chain simulator builder mapping sorting operations
  const makeChain = (resolvedValue = null) => ({
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    then: jest.fn(function (callback) {
      return Promise.resolve(callback(resolvedValue));
    }),
  });

  beforeEach(() => {
    mockModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
    };
    repository = createLeapRequestRepository(mockModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findLatestByMenteeAndStatus ─────────────────────────────────────────
  describe("findLatestByMenteeAndStatus", () => {
    test("should execute findOne and arrange query arrays by inverse creation intervals", async () => {
      const chain = makeChain(mockLeapRecord);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findLatestByMenteeAndStatus(
        "user444",
        "pending",
      );

      expect(mockModel.findOne).toHaveBeenCalledWith({
        mentee: "user444",
        status: "pending",
      });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockLeapRecord);
    });

    test("should resolve null if no requests align with state constraints", async () => {
      const chain = makeChain(null);
      mockModel.findOne.mockReturnValue(chain);

      const result = await repository.findLatestByMenteeAndStatus(
        "userUnknown",
        "approved",
      );
      expect(result).toBeNull();
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should write new transaction documents down safely", async () => {
      mockModel.create.mockResolvedValue(mockLeapRecord);
      const payload = { mentee: "user444", currentBalance: 250 };

      const result = await repository.create(payload);

      expect(mockModel.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockLeapRecord);
    });

    test("should pass runtime exceptions upward cleanly if database validation rejects entries", async () => {
      mockModel.create.mockRejectedValue(
        new Error("Enum Type Constraint Violation"),
      );
      await expect(repository.create({})).rejects.toThrow(
        "Enum Type Constraint Violation",
      );
    });
  });

  // ── findAllWithMentee ───────────────────────────────────────────────────
  describe("findAllWithMentee", () => {
    test("should build deep baseline populations cross-referencing parent user profiles", async () => {
      const chain = makeChain([mockLeapRecord]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAllWithMentee({ status: "pending" });

      expect(mockModel.find).toHaveBeenCalledWith({ status: "pending" });
      expect(chain.populate).toHaveBeenCalledWith(
        "mentee",
        "name email profilePicture",
      );
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([mockLeapRecord]);
    });
  });

  // ── countByStatus ───────────────────────────────────────────────────────
  describe("countByStatus", () => {
    test("should return absolute numerical volumes processing targeted fields", async () => {
      mockModel.countDocuments.mockResolvedValue(18);
      const result = await repository.countByStatus("rejected");
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        status: "rejected",
      });
      expect(result).toBe(18);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────
  describe("findById", () => {
    test("should seek targeted individual entries directly via primary indexing", async () => {
      mockModel.findById.mockResolvedValue(mockLeapRecord);
      const result = await repository.findById("leapReq123");
      expect(mockModel.findById).toHaveBeenCalledWith("leapReq123");
      expect(result).toEqual(mockLeapRecord);
    });
  });

  // ── save ────────────────────────────────────────────────────────────────
  describe("save", () => {
    test("should invoke persistence updates directly onto document contexts", async () => {
      const mockDoc = { save: jest.fn().mockResolvedValue(mockLeapRecord) };
      const result = await repository.save(mockDoc);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockLeapRecord);
    });
  });
});
