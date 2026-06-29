/**
 * @fileoverview Leap Request Repository Corporate Unit Tests
 * @description Thoroughly verifies Mongoose lookup constraints, sequential sorting chains,
 * subdocument populations, and mutation wrappers using isolated driver mocks.
 */

const createLeapRequestRepository = require("../../../repositories/leapRequest.repository");

describe("LeapRequest Repository", () => {
  let mockLeapRequestModel;
  let leapRequestRepository;

  const mockLeapRequestRecord = {
    _id: "leap123",
    mentee: "user555",
    status: "pending",
    createdAt: new Date("2026-06-01"),
  };

  const mockRecordsArray = [mockLeapRequestRecord];

  // Safe Factory: Decorates a real Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.populate = jest.fn().mockReturnValue(promise);

    return promise;
  };

  beforeEach(() => {
    mockLeapRequestModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
    };
    leapRequestRepository = createLeapRequestRepository(mockLeapRequestModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findLatestByMenteeAndStatus ─────────────────────────────────────────
  describe("findLatestByMenteeAndStatus", () => {
    test("should fetch request matching parameters and append reverse chronological sorting", async () => {
      const mockChain = makeChain(mockLeapRequestRecord);
      mockLeapRequestModel.findOne.mockReturnValue(mockChain);

      const result = await leapRequestRepository.findLatestByMenteeAndStatus(
        "user555",
        "pending",
      );

      expect(mockLeapRequestModel.findOne).toHaveBeenCalledWith({
        mentee: "user555",
        status: "pending",
      });
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockLeapRequestRecord);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should immediately persist incoming data structural payloads", async () => {
      mockLeapRequestModel.create.mockResolvedValue(mockLeapRequestRecord);
      const payloadData = { mentee: "user555", status: "pending" };

      const result = await leapRequestRepository.create(payloadData);

      expect(mockLeapRequestModel.create).toHaveBeenCalledWith(payloadData);
      expect(result).toEqual(mockLeapRequestRecord);
    });
  });

  // ── findAllWithMentee ───────────────────────────────────────────────────
  describe("findAllWithMentee", () => {
    test("should query items with custom filters and correctly pipe population fields and sorting rules", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockLeapRequestModel.find.mockReturnValue(mockChain);
      const queryFilter = { status: "pending" };

      const result = await leapRequestRepository.findAllWithMentee(queryFilter);

      expect(mockLeapRequestModel.find).toHaveBeenCalledWith(queryFilter);
      expect(mockChain.populate).toHaveBeenCalledWith(
        "mentee",
        "name email profilePicture",
      );
      expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── countByStatus ───────────────────────────────────────────────────────
  describe("countByStatus", () => {
    test("should forward lookup rules to calculate document thresholds exactly", async () => {
      mockLeapRequestModel.countDocuments.mockResolvedValue(42);

      const count = await leapRequestRepository.countByStatus("completed");

      expect(mockLeapRequestModel.countDocuments).toHaveBeenCalledWith({
        status: "completed",
      });
      expect(count).toBe(42);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────
  describe("findById", () => {
    test("should retrieve a singular matching file context tracking explicit identifiers", async () => {
      mockLeapRequestModel.findById.mockResolvedValue(mockLeapRequestRecord);

      const result = await leapRequestRepository.findById("leap123");

      expect(mockLeapRequestModel.findById).toHaveBeenCalledWith("leap123");
      expect(result).toEqual(mockLeapRequestRecord);
    });
  });

  // ── save ────────────────────────────────────────────────────────────────
  describe("save", () => {
    test("should execute native document instance persistence commands smoothly", async () => {
      const mockInstance = {
        ...mockLeapRequestRecord,
        save: jest.fn().mockResolvedValue(mockLeapRequestRecord),
      };

      const result = await leapRequestRepository.save(mockInstance);

      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockLeapRequestRecord);
    });
  });
});
