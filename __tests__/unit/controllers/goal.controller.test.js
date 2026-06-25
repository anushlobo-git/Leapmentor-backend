const createGoalController = require("../../../controllers/goal.controller");

describe("Goal Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      createGoal: jest.fn(),
      getGoalByConnection: jest.fn(),
      updateGoal: jest.fn(),
    };
    controller = createGoalController(mockService);
    mockReq = { user: { _id: "user_uuid" }, body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("createGoal should cleanly pass parameters mapping 201 structural configurations", async () => {
    mockReq.body = {
      connectRequestId: "c_id",
      title: "Objective Roadmap Matrix",
    };
    mockService.createGoal.mockResolvedValue({ _id: "goal_999" });

    await controller.createGoal(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      goal: { _id: "goal_999" },
    });
  });
});
