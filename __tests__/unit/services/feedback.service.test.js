const createFeedbackService = require("../../../services/feedback.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/feedback.mapper", () => ({
  toFeedbackDTO: jest.fn((val) => (val ? { isDTO: true, ...val } : null)),
}));

describe("Feedback Service Unit Tests", () => {
  let mockFeedbackRepo, mockConnectRepo, mockMentorRepo, service;

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

    service = createFeedbackService(
      mockFeedbackRepo,
      mockConnectRepo,
      mockMentorRepo,
    );
  });

  test("createFeedback should block operations if the user is not a participant", async () => {
    mockConnectRepo.findByIdForFeedback.mockResolvedValue({
      mentor: "m1",
      mentee: "u2",
    });

    await expect(
      service.createFeedback({
        connectRequestId: "c1",
        rating: 5,
        userId: "intruder",
      }),
    ).rejects.toThrow(
      new AppError("Not authorized to submit feedback for this session", 403),
    );
  });

  test("createFeedback should block duplicate evaluation entries matching parameters", async () => {
    mockConnectRepo.findByIdForFeedback.mockResolvedValue({
      mentor: "m1",
      mentee: "u2",
      status: "completed",
    });
    mockFeedbackRepo.findOne.mockResolvedValue({ _id: "existing_feedback" });

    await expect(
      service.createFeedback({
        connectRequestId: "c1",
        rating: 4,
        userId: "m1",
      }),
    ).rejects.toThrow(
      new AppError("You have already submitted feedback for this session", 409),
    );
  });
});
