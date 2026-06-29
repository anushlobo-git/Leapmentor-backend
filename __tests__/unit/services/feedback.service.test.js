/**
 * @fileoverview Feedback Service Unit Tests
 * @description Full branch coverage for createFeedback, getFeedback, _deriveParticipantRole,
 * _validateSessionCompletion, and _recalculateMentorAvgRating.
 */

const createFeedbackService = require("../../../services/feedback.service");
const { toFeedbackDTO } = require("../../../mappers/feedback.mapper");

jest.mock("../../../mappers/feedback.mapper", () => ({
  toFeedbackDTO: jest.fn((val) => (val ? { isDTO: true, ...val } : null)),
}));

describe("Feedback Service Unit Tests", () => {
  let mockFeedbackRepo, mockConnectRepo, mockMentorRepo, service;

  // Minimal completed session used as a base across many tests
  const baseSession = {
    mentor: "mentor_id",
    mentee: "mentee_id",
    status: "completed",
    selectedSlots: [],
  };

  beforeEach(() => {
    mockFeedbackRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndPopulateParticipants: jest.fn(),
      findAllByConnectRequest: jest.fn(),
      findAllByTargetUser: jest.fn(),
    };
    mockConnectRepo = { findByIdForFeedback: jest.fn() };
    mockMentorRepo = { updateAvgRating: jest.fn() };

    service = createFeedbackService({
      feedbackRepo: mockFeedbackRepo,
      connectRequestRepo: mockConnectRepo,
      mentorProfileRepo: mockMentorRepo,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // createFeedback — input validation guards
  // ---------------------------------------------------------------------------
  describe("createFeedback input validation", () => {
    test("should throw 400 when connectRequestId is missing", async () => {
      await expect(
        service.createFeedback({ rating: 4, userId: "u1" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "connectRequestId is required",
      });
    });

    test("should throw 400 when rating is falsy (0 / undefined)", async () => {
      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 0,
          userId: "u1",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "rating must be between 1 and 5",
      });

      await expect(
        service.createFeedback({ connectRequestId: "c1", userId: "u1" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "rating must be between 1 and 5",
      });
    });

    test("should throw 400 when rating is below MIN_RATING (< 1)", async () => {
      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: -1,
          userId: "u1",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "rating must be between 1 and 5",
      });
    });

    test("should throw 400 when rating exceeds MAX_RATING (> 5)", async () => {
      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 6,
          userId: "u1",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "rating must be between 1 and 5",
      });
    });

    test("should throw 404 when connectRequest is not found", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(null);

      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 4,
          userId: "u1",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Session not found",
      });
    });

    test("should throw 403 when user is not a participant in the session", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue({
        mentor: "mentor_id",
        mentee: "mentee_id",
        status: "completed",
      });

      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 4,
          userId: "intruder",
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Not authorized to submit feedback for this session",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // _deriveParticipantRole — populated objects vs plain string IDs
  // ---------------------------------------------------------------------------
  describe("_deriveParticipantRole ID resolution", () => {
    test("should resolve mentor role when mentor is a populated object with _id", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue({
        mentor: { _id: "mentor_id" }, // populated object
        mentee: { _id: "mentee_id" },
        status: "completed",
      });
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb1" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb1",
      });

      const result = await service.createFeedback({
        connectRequestId: "c1",
        rating: 3,
        userId: "mentor_id",
      });

      expect(result.isDTO).toBe(true);
      // mentor submitting → toUserId is menteeId; no rating recalc
      expect(mockMentorRepo.updateAvgRating).not.toHaveBeenCalled();
    });

    test("should resolve mentee role when mentee is a plain string ID", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue({
        mentor: "mentor_id", // plain string
        mentee: "mentee_id", // plain string
        status: "completed",
      });
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb2" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb2",
      });
      mockFeedbackRepo.findAllByTargetUser.mockResolvedValue([
        { rating: 4 },
        { rating: 5 },
      ]);

      await service.createFeedback({
        connectRequestId: "c1",
        rating: 4,
        userId: "mentee_id",
      });

      // mentee submitting → rating recalc triggered for mentor
      expect(mockMentorRepo.updateAvgRating).toHaveBeenCalledWith(
        "mentor_id",
        4.5,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // _validateSessionCompletion — slotIndex branch
  // ---------------------------------------------------------------------------
  describe("_validateSessionCompletion with slotIndex", () => {
    const sessionWithSlots = {
      mentor: "mentor_id",
      mentee: "mentee_id",
      status: "ongoing", // status doesn't matter when slotIndex is given
      selectedSlots: [
        { menteeMarked: true, mentorMarked: false }, // index 0: mentee done, mentor not
        { menteeMarked: true, mentorMarked: true }, // index 1: both done
      ],
    };

    test("should throw 400 when slot at slotIndex does not exist", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(sessionWithSlots);

      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 4,
          userId: "mentee_id",
          slotIndex: 99, // out of bounds → slot is undefined
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Feedback can only be submitted for completed sessions",
      });
    });

    test("should throw 400 when slot exists but mentorMarked is false (mentor submitting)", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(sessionWithSlots);

      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 4,
          userId: "mentor_id",
          slotIndex: 0, // slot 0: mentorMarked is false
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Feedback can only be submitted for completed sessions",
      });
    });

    test("should throw 400 when slot exists but menteeMarked is false (mentee submitting)", async () => {
      const sessionMenteeMissing = {
        ...sessionWithSlots,
        selectedSlots: [{ menteeMarked: false, mentorMarked: true }],
      };
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(
        sessionMenteeMissing,
      );

      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 4,
          userId: "mentee_id",
          slotIndex: 0,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Feedback can only be submitted for completed sessions",
      });
    });

    test("should pass validation and include slotIndex in duplicate query when slot is valid", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(sessionWithSlots);
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb3" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb3",
      });
      mockFeedbackRepo.findAllByTargetUser.mockResolvedValue([{ rating: 5 }]);

      await service.createFeedback({
        connectRequestId: "c1",
        rating: 5,
        userId: "mentee_id",
        slotIndex: 0, // slot 0: menteeMarked is true ✓
      });

      // duplicate query must include slotIndex
      expect(mockFeedbackRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ slotIndex: 0 }),
      );
      // create payload must include slotIndex
      expect(mockFeedbackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slotIndex: 0 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // _validateSessionCompletion — no slotIndex branch (status check)
  // ---------------------------------------------------------------------------
  describe("_validateSessionCompletion without slotIndex", () => {
    test("should throw 400 when session status is not completed and no slotIndex provided", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue({
        mentor: "mentor_id",
        mentee: "mentee_id",
        status: "pending",
      });

      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 4,
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Feedback can only be submitted for completed sessions",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // createFeedback — duplicate guard
  // ---------------------------------------------------------------------------
  describe("createFeedback duplicate guard", () => {
    test("should throw 409 when feedback already exists for this session", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findOne.mockResolvedValue({ _id: "existing_feedback" });

      await expect(
        service.createFeedback({
          connectRequestId: "c1",
          rating: 4,
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "You have already submitted feedback for this session",
      });
    });

    test("should NOT include slotIndex in duplicate query when slotIndex is absent", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb4" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb4",
      });

      await service.createFeedback({
        connectRequestId: "c1",
        rating: 3,
        userId: "mentor_id",
      });

      const callArg = mockFeedbackRepo.findOne.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("slotIndex");
    });
  });

  // ---------------------------------------------------------------------------
  // createFeedback — comment trim fallback
  // ---------------------------------------------------------------------------
  describe("createFeedback comment handling", () => {
    test("should store empty string when comment is undefined (comment?.trim() || '')", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb5" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb5",
      });

      await service.createFeedback({
        connectRequestId: "c1",
        rating: 3,
        userId: "mentor_id",
        // comment intentionally omitted
      });

      expect(mockFeedbackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ comment: "" }),
      );
    });

    test("should trim whitespace from comment", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb6" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb6",
      });

      await service.createFeedback({
        connectRequestId: "c1",
        rating: 3,
        userId: "mentor_id",
        comment: "  Great session!  ",
      });

      expect(mockFeedbackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ comment: "Great session!" }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // _recalculateMentorAvgRating — empty feedback early return
  // ---------------------------------------------------------------------------
  describe("_recalculateMentorAvgRating", () => {
    test("should skip updateAvgRating when no feedback exists for the mentor (early return)", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb7" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb7",
      });
      mockFeedbackRepo.findAllByTargetUser.mockResolvedValue([]); // empty → early return

      await service.createFeedback({
        connectRequestId: "c1",
        rating: 5,
        userId: "mentee_id", // mentee → triggers recalc
      });

      expect(mockFeedbackRepo.findAllByTargetUser).toHaveBeenCalledWith(
        "mentor_id",
      );
      expect(mockMentorRepo.updateAvgRating).not.toHaveBeenCalled();
    });

    test("should compute and store correct average across multiple ratings", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.create.mockResolvedValue({ _id: "fb8" });
      mockFeedbackRepo.findByIdAndPopulateParticipants.mockResolvedValue({
        _id: "fb8",
      });
      mockFeedbackRepo.findAllByTargetUser.mockResolvedValue([
        { rating: 4 },
        { rating: 3 },
        { rating: 5 },
      ]);

      await service.createFeedback({
        connectRequestId: "c1",
        rating: 4,
        userId: "mentee_id",
      });

      // (4 + 3 + 5) / 3 = 4.0
      expect(mockMentorRepo.updateAvgRating).toHaveBeenCalledWith(
        "mentor_id",
        4.0,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getFeedback
  // ---------------------------------------------------------------------------
  describe("getFeedback", () => {
    test("should throw 404 when session is not found", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(null);

      await expect(
        service.getFeedback("c1", "mentor_id"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Session not found",
      });
    });

    test("should throw 403 when user is not a participant", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);

      await expect(service.getFeedback("c1", "intruder")).rejects.toMatchObject(
        {
          statusCode: 403,
          message: "Not authorized to view this session's feedback",
        },
      );
    });

    test("should return myFeedback and theirFeedback when session is completed and both found", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findAllByConnectRequest.mockResolvedValue([
        { from: { _id: "mentor_id" }, rating: 4 }, // my feedback (from populated _id)
        { from: "mentee_id", rating: 5 }, // their feedback (from plain string)
      ]);

      const result = await service.getFeedback("c1", "mentor_id");

      expect(result.myFeedback).toEqual(
        expect.objectContaining({ isDTO: true }),
      );
      expect(result.theirFeedback).toEqual(
        expect.objectContaining({ isDTO: true }),
      );
      expect(result.sessionStatus).toBe("completed");
    });

    test("should return theirFeedback as null when session is not completed", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue({
        ...baseSession,
        status: "ongoing",
      });
      mockFeedbackRepo.findAllByConnectRequest.mockResolvedValue([]);

      const result = await service.getFeedback("c1", "mentor_id");

      expect(result.theirFeedback).toBeNull();
      expect(result.sessionStatus).toBe("ongoing");
    });

    test("should return myFeedback and theirFeedback as null when no feedback exists yet", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findAllByConnectRequest.mockResolvedValue([]);

      const result = await service.getFeedback("c1", "mentor_id");

      // toFeedbackDTO(null) → null per our mock
      expect(result.myFeedback).toBeNull();
      expect(result.theirFeedback).toBeNull();
    });

    test("should resolve f.from as plain string ID when feedback.from has no _id", async () => {
      mockConnectRepo.findByIdForFeedback.mockResolvedValue(baseSession);
      mockFeedbackRepo.findAllByConnectRequest.mockResolvedValue([
        { from: "mentor_id", rating: 3 }, // plain string — tests ?? branch
      ]);

      const result = await service.getFeedback("c1", "mentor_id");

      expect(result.myFeedback).toEqual(
        expect.objectContaining({ isDTO: true }),
      );
      // theirFeedback: no matching "other" entry, falls back to null via || null
      expect(result.theirFeedback).toBeNull();
    });
  });
});
