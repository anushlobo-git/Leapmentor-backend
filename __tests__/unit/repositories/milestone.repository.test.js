/**
 * @fileoverview Milestone Repository Corporate Unit Tests
 * @description Assures precise verification of lookup criteria, multi-key sorting,
 * lean optimizations, and mutation methods with zero network dependencies.
 */

const createMilestoneRepository = require("../../../repositories/milestone.repository");

describe("Milestone Repository", () => {
  let mockMilestoneModel;
  let milestoneRepository;

  const mockMilestoneRecord = {
    _id: "ms111",
    goal: "goal456",
    title: "Complete Application Architecture Design",
    order: 1,
    createdAt: new Date("2026-06-25"),
  };

  const mockRecordsArray = [mockMilestoneRecord];

  // Safe Factory: Decorates a genuine Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the native Promise, returning itself for fluid chaining
    promise.sort = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockMilestoneModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    milestoneRepository = createMilestoneRepository(mockMilestoneModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAllByGoalSorted ─────────────────────────────────────────────────
  describe("findAllByGoalSorted", () => {
    test("should fetch milestones by goal ID and chain explicit multi-key sorting instructions", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockMilestoneModel.find.mockReturnValue(mockChain);

      const result = await milestoneRepository.findAllByGoalSorted("goal456");

      expect(mockMilestoneModel.find).toHaveBeenCalledWith({ goal: "goal456" });
      expect(mockChain.sort).toHaveBeenCalledWith({ order: 1, createdAt: 1 });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── findLastMilestone ───────────────────────────────────────────────────
  describe("findLastMilestone", () => {
    test("should discover the highest ordered milestone element inside a goal context", async () => {
      const mockChain = makeChain(mockMilestoneRecord);
      mockMilestoneModel.findOne.mockReturnValue(mockChain);

      const result = await milestoneRepository.findLastMilestone("goal456");

      expect(mockMilestoneModel.findOne).toHaveBeenCalledWith({
        goal: "goal456",
      });
      expect(mockChain.sort).toHaveBeenCalledWith({ order: -1 });
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockMilestoneRecord);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should instantiate and save a new structural milestone document sequence payload", async () => {
      mockMilestoneModel.create.mockResolvedValue(mockMilestoneRecord);
      const incomingPayload = {
        goal: "goal456",
        title: "Complete Application Architecture Design",
        order: 1,
      };

      const result = await milestoneRepository.create(incomingPayload);

      expect(mockMilestoneModel.create).toHaveBeenCalledWith(incomingPayload);
      expect(result).toEqual(mockMilestoneRecord);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────
  describe("findById", () => {
    test("should retrieve a single milestone matching an explicit object database identifier", async () => {
      mockMilestoneModel.findById.mockResolvedValue(mockMilestoneRecord);

      const result = await milestoneRepository.findById("ms111");

      expect(mockMilestoneModel.findById).toHaveBeenCalledWith("ms111");
      expect(result).toEqual(mockMilestoneRecord);
    });
  });

  // ── save ────────────────────────────────────────────────────────────────
  describe("save", () => {
    test("should fire internal persistence routines on the given document instance context reference", async () => {
      const mockInstance = {
        ...mockMilestoneRecord,
        save: jest.fn().mockResolvedValue(mockMilestoneRecord),
      };

      const result = await milestoneRepository.save(mockInstance);

      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(mockMilestoneRecord);
    });
  });

  // ── deleteById ──────────────────────────────────────────────────────────
  describe("deleteById", () => {
    test("should dispatch target document removal pipelines matching an explicit record key", async () => {
      mockMilestoneModel.findByIdAndDelete.mockResolvedValue(
        mockMilestoneRecord,
      );

      const result = await milestoneRepository.deleteById("ms111");

      expect(mockMilestoneModel.findByIdAndDelete).toHaveBeenCalledWith(
        "ms111",
      );
      expect(result).toEqual(mockMilestoneRecord);
    });
  });
});
