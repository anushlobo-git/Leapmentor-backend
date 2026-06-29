/**
 * @fileoverview Goal Repository Corporate Unit Tests
 * @description Assures precise verification of lookup criteria, lean queries,
 * and instance level mutations with zero network dependency.
 */

const createGoalRepository = require("../../../repositories/goal.repository");

describe("Goal Repository", () => {
  let mockGoalModel;
  let goalRepository;

  const mockGoalRecord = {
    _id: "goal123",
    connectRequest: "req456",
    title: "Master Backend System Architecture",
    status: "active",
  };

  // Safe Factory: Decorates a real Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the genuine Promise
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockGoalModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    goalRepository = createGoalRepository(mockGoalModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findOneByConnectRequest ─────────────────────────────────────────────
  describe("findOneByConnectRequest", () => {
    test("should look up a goal document using standard criteria properties", async () => {
      const mockChain = makeChain(mockGoalRecord);
      mockGoalModel.findOne.mockReturnValue(mockChain);

      const result = await goalRepository.findOneByConnectRequest("req456");

      expect(mockGoalModel.findOne).toHaveBeenCalledWith({
        connectRequest: "req456",
      });
      expect(result).toEqual(mockGoalRecord);
    });
  });

  // ── findOneByConnectRequestLean ─────────────────────────────────────────
  describe("findOneByConnectRequestLean", () => {
    test("should find a goal document and execute a read-only lean optimization wrapper", async () => {
      const mockChain = makeChain(mockGoalRecord);
      mockGoalModel.findOne.mockReturnValue(mockChain);

      const result = await goalRepository.findOneByConnectRequestLean("req456");

      expect(mockGoalModel.findOne).toHaveBeenCalledWith({
        connectRequest: "req456",
      });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockGoalRecord);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should create and return a brand-new goal document sequence payload", async () => {
      mockGoalModel.create.mockResolvedValue(mockGoalRecord);
      const goalData = {
        connectRequest: "req456",
        title: "Master Backend System Architecture",
      };

      const result = await goalRepository.create(goalData);

      expect(mockGoalModel.create).toHaveBeenCalledWith(goalData);
      expect(result).toEqual(mockGoalRecord);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────
  describe("findById", () => {
    test("should fetch a single goal document matching an explicit object identifier", async () => {
      mockGoalModel.findById.mockResolvedValue(mockGoalRecord);

      const result = await goalRepository.findById("goal123");

      expect(mockGoalModel.findById).toHaveBeenCalledWith("goal123");
      expect(result).toEqual(mockGoalRecord);
    });
  });

  // ── save ────────────────────────────────────────────────────────────────
  describe("save", () => {
    test("should execute inner save routines on a provided document instance reference", async () => {
      const mockInstance = {
        ...mockGoalRecord,
        save: jest.fn().mockResolvedValue(mockGoalRecord),
      };

      const result = await goalRepository.save(mockInstance);

      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockGoalRecord);
    });
  });
});
