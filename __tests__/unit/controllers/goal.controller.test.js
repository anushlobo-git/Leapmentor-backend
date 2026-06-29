const createGoalController = require("../../../controllers/goal.controller");

describe("Goal Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      createGoal: jest.fn(),
      getGoalByConnection: jest.fn(),
      updateGoal: jest.fn(),
      createMilestone: jest.fn(),
      updateMilestone: jest.fn(),
      deleteMilestone: jest.fn(),
    };
    controller = createGoalController({ goalService: mockService });
    mockReq = {
      user: { _id: "user_uuid" },
      body: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("createGoal should create a goal and return 201", async () => {
    mockReq.body = {
      connectRequestId: "c_id",
      title: "Goal Title",
      description: "Goal Desc",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    };
    const mockGoal = { _id: "goal_999" };
    mockService.createGoal.mockResolvedValue(mockGoal);

    await controller.createGoal(mockReq, mockRes, mockNext);
    expect(mockService.createGoal).toHaveBeenCalledWith({
      connectRequestId: "c_id",
      title: "Goal Title",
      description: "Goal Desc",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      userId: "user_uuid",
    });
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      goal: mockGoal,
    });
  });

  test("getGoal should return a goal and return 200", async () => {
    mockReq.params.connectRequestId = "c_id";
    const mockResult = { goal: { _id: "goal_999" }, milestones: [] };
    mockService.getGoalByConnection.mockResolvedValue(mockResult);

    await controller.getGoal(mockReq, mockRes, mockNext);
    expect(mockService.getGoalByConnection).toHaveBeenCalledWith("c_id", "user_uuid");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      ...mockResult,
    });
  });

  test("updateGoal should update a goal and return 200", async () => {
    mockReq.params.goalId = "g_id";
    mockReq.body = {
      title: "New Title",
      description: "New Desc",
      startDate: "2026-02-01",
      endDate: "2026-11-30",
      status: "in-progress",
    };
    const mockGoal = { _id: "g_id", title: "New Title" };
    mockService.updateGoal.mockResolvedValue(mockGoal);

    await controller.updateGoal(mockReq, mockRes, mockNext);
    expect(mockService.updateGoal).toHaveBeenCalledWith({
      goalId: "g_id",
      title: "New Title",
      description: "New Desc",
      startDate: "2026-02-01",
      endDate: "2026-11-30",
      status: "in-progress",
      userId: "user_uuid",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      goal: mockGoal,
    });
  });

  test("createMilestone should create a milestone and return 201", async () => {
    mockReq.params.goalId = "g_id";
    mockReq.body = {
      title: "Milestone Title",
      description: "Milestone Desc",
      dueDate: "2026-06-01",
    };
    const mockMilestone = { _id: "m_id" };
    mockService.createMilestone.mockResolvedValue(mockMilestone);

    await controller.createMilestone(mockReq, mockRes, mockNext);
    expect(mockService.createMilestone).toHaveBeenCalledWith({
      goalId: "g_id",
      title: "Milestone Title",
      description: "Milestone Desc",
      dueDate: "2026-06-01",
      userId: "user_uuid",
    });
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      milestone: mockMilestone,
    });
  });

  test("updateMilestone should update a milestone and return 200", async () => {
    mockReq.params.milestoneId = "m_id";
    mockReq.body = {
      title: "New Title",
      description: "New Desc",
      isCompleted: true,
    };
    const mockMilestone = { _id: "m_id", isCompleted: true };
    mockService.updateMilestone.mockResolvedValue(mockMilestone);

    await controller.updateMilestone(mockReq, mockRes, mockNext);
    expect(mockService.updateMilestone).toHaveBeenCalledWith({
      milestoneId: "m_id",
      title: "New Title",
      description: "New Desc",
      isCompleted: true,
      userId: "user_uuid",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      milestone: mockMilestone,
    });
  });

  test("deleteMilestone should delete a milestone and return 200", async () => {
    mockReq.params.milestoneId = "m_id";
    mockService.deleteMilestone.mockResolvedValue("m_id");

    await controller.deleteMilestone(mockReq, mockRes, mockNext);
    expect(mockService.deleteMilestone).toHaveBeenCalledWith("m_id", "user_uuid");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Milestone deleted",
      milestoneId: "m_id",
    });
  });
});
