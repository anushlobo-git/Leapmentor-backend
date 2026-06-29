/**
 * @fileoverview Feedback Repository Corporate Unit Tests
 * @description Assures precise verification of selection queries, population fields,
 * and data mapping structures using zero-network isolated Mongoose mocks.
 */

const createFeedbackRepository = require("../../../repositories/feedback.repository");

describe("Feedback Repository", () => {
  let mockFeedbackModel;
  let feedbackRepository;

  const mockFeedbackRecord = {
    _id: "fb123",
    connectRequest: "req789",
    from: "userA",
    to: "userB",
    rating: 5,
    comment: "Outstanding mentorship session!",
  };

  const mockRecordsArray = [mockFeedbackRecord];

  // Safe Factory: Decorates a real Promise instance to completely avoid "manual then" linter errors
  const makeChain = (resolvedValue = null) => {
    const promise = Promise.resolve(resolvedValue);

    // Attach Mongoose chain builders directly to the genuine Promise
    promise.populate = jest.fn().mockReturnValue(promise);
    promise.lean = jest
      .fn()
      .mockImplementation(() => Promise.resolve(resolvedValue));

    return promise;
  };

  beforeEach(() => {
    mockFeedbackModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
    };
    feedbackRepository = createFeedbackRepository(mockFeedbackModel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findOne ─────────────────────────────────────────────────────────────
  describe("findOne", () => {
    test("should execute findOne matching specified runtime criteria constraints", async () => {
      mockFeedbackModel.findOne.mockResolvedValue(mockFeedbackRecord);
      const queryFilter = { connectRequest: "req789", from: "userA" };

      const result = await feedbackRepository.findOne(queryFilter);

      expect(mockFeedbackModel.findOne).toHaveBeenCalledWith(queryFilter);
      expect(result).toEqual(mockFeedbackRecord);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────
  describe("create", () => {
    test("should instantiate and persist a brand-new feedback entry payload", async () => {
      mockFeedbackModel.create.mockResolvedValue(mockFeedbackRecord);
      const dataPayload = { connectRequest: "req789", rating: 5 };

      const result = await feedbackRepository.create(dataPayload);

      expect(mockFeedbackModel.create).toHaveBeenCalledWith(dataPayload);
      expect(result).toEqual(mockFeedbackRecord);
    });
  });

  // ── findByIdAndPopulateParticipants ─────────────────────────────────────
  describe("findByIdAndPopulateParticipants", () => {
    test("should chain multi-stage population mappings before lean parsing execution", async () => {
      const mockChain = makeChain(mockFeedbackRecord);
      mockFeedbackModel.findById.mockReturnValue(mockChain);

      const result =
        await feedbackRepository.findByIdAndPopulateParticipants("fb123");

      expect(mockFeedbackModel.findById).toHaveBeenCalledWith("fb123");
      expect(mockChain.populate).toHaveBeenCalledWith("from", "name email");
      expect(mockChain.populate).toHaveBeenCalledWith("to", "name email");
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockFeedbackRecord);
    });
  });

  // ── findAllByConnectRequest ─────────────────────────────────────────────
  describe("findAllByConnectRequest", () => {
    test("should filter feedback array by relationship keys and populate the sender info", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockFeedbackModel.find.mockReturnValue(mockChain);

      const result = await feedbackRepository.findAllByConnectRequest("req789");

      expect(mockFeedbackModel.find).toHaveBeenCalledWith({
        connectRequest: "req789",
      });
      expect(mockChain.populate).toHaveBeenCalledWith("from", "name email");
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });

  // ── findAllByTargetUser ──────────────────────────────────────────────────
  describe("findAllByTargetUser", () => {
    test("should fetch a read-only list matching the targeted recipient ID field", async () => {
      const mockChain = makeChain(mockRecordsArray);
      mockFeedbackModel.find.mockReturnValue(mockChain);

      const result = await feedbackRepository.findAllByTargetUser("userB");

      expect(mockFeedbackModel.find).toHaveBeenCalledWith({ to: "userB" });
      expect(mockChain.populate).not.toHaveBeenCalled();
      expect(mockChain.lean).toHaveBeenCalled();
      expect(result).toEqual(mockRecordsArray);
    });
  });
});
