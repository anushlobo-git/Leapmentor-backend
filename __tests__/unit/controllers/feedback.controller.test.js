/**
 * @fileoverview Peer Feedback Interface Controller Unit Tests
 * @description Verifies assessment payload submittals, dynamic rating constraints,
 * error propagation, and response flattening across network boundaries.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createFeedbackController = require("../../../controllers/feedback.controller");

describe("FeedbackController", () => {
  let mockFeedbackService;
  let controller;
  let req;
  let res;
  let next;

  const mockFeedbackRecord = {
    _id: "fb_12345",
    connectRequest: "req_777",
    rating: 5,
    comment:
      "Exceptional architecture review session. Very clear explanation of Redis queues.",
    slotIndex: 0,
    user: "user_mentee_999",
  };

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockFeedbackService = {
      createFeedback: jest.fn(),
      getFeedback: jest.fn(),
    };

    controller = createFeedbackController({
      feedbackService: mockFeedbackService,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      user: { _id: "user_mentee_999" },
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── createFeedback ──────────────────────────────────────────────────────
  describe("createFeedback", () => {
    test("should return 201 and confirmation payload on successful submission", async () => {
      req.user._id = "user_variant_mentee_888"; // Varying user context dynamically
      req.body = {
        connectRequestId: "req_777",
        rating: 5,
        comment: "Great mentor session!",
        slotIndex: 0,
      };

      const dynamicResult = {
        ...mockFeedbackRecord,
        user: "user_variant_mentee_888",
      };
      mockFeedbackService.createFeedback.mockResolvedValue(dynamicResult);

      await controller.createFeedback(req, res, next);

      expect(mockFeedbackService.createFeedback).toHaveBeenCalledWith({
        connectRequestId: "req_777",
        rating: 5,
        comment: "Great mentor session!",
        slotIndex: 0,
        userId: "user_variant_mentee_888",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Feedback submitted successfully.",
        feedback: dynamicResult,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when create service throws", async () => {
      req.body = { connectRequestId: "req_777", rating: 12 }; // Out of bounds value emulation
      const error = new Error(
        "Validation failed: Rating score must be between 1 and 5",
      );
      mockFeedbackService.createFeedback.mockRejectedValue(error);

      await controller.createFeedback(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ── getFeedback ─────────────────────────────────────────────────────────
  describe("getFeedback", () => {
    test("should return 200 and spread structural history details directly on success", async () => {
      req.params.connectRequestId = "req_777";
      req.user._id = "user_variant_mentor_111"; // Varying dynamic context mapping

      const mockServiceOutput = {
        items: [mockFeedbackRecord],
        averageRating: 5,
      };
      mockFeedbackService.getFeedback.mockResolvedValue(mockServiceOutput);

      await controller.getFeedback(req, res, next);

      expect(mockFeedbackService.getFeedback).toHaveBeenCalledWith(
        "req_777",
        "user_variant_mentor_111",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        items: [mockFeedbackRecord],
        averageRating: 5,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold status updates when lookup service throws", async () => {
      req.params.connectRequestId = "req_missing";
      const error = new Error(
        "Target connection relationship record not found",
      );
      mockFeedbackService.getFeedback.mockRejectedValue(error);

      await controller.getFeedback(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
