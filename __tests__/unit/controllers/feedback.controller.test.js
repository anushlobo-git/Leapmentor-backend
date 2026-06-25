const createFeedbackController = require("../../../controllers/feedback.controller");

describe("Feedback Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = { createFeedback: jest.fn(), getFeedback: jest.fn() };
    controller = createFeedbackController(mockService);
    mockReq = { user: { _id: "u1" }, body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("createFeedback should reply with a 201 status code on success tracks", async () => {
    mockReq.body = { connectRequestId: "c1", rating: 5 };
    mockService.createFeedback.mockResolvedValue({ _id: "f1" });

    await controller.createFeedback(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});
