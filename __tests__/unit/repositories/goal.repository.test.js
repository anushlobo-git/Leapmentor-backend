const createGoalRepository = require("../../../repositories/goal.repository");

describe("Goal Repository Unit Tests", () => {
  let mockGoalModel, repository;

  beforeEach(() => {
    mockGoalModel = {
      findOne: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({ _id: "lean_goal_123" }),
      })),
      create: jest.fn(),
      findById: jest.fn(),
    };
    repository = createGoalRepository(mockGoalModel);
  });

  test("findOneByConnectRequestLean should invoke plain document projections", async () => {
    const result = await repository.findOneByConnectRequestLean("session_01");
    expect(mockGoalModel.findOne).toHaveBeenCalledWith({
      connectRequest: "session_01",
    });
    expect(result._id).toBe("lean_goal_123");
  });

  test("save should prompt baseline schema serialization triggers", async () => {
    const mockInstance = {
      save: jest.fn().mockResolvedValue({ status: "active" }),
    };
    const result = await repository.save(mockInstance);
    expect(mockInstance.save).toHaveBeenCalled();
    expect(result.status).toBe("active");
  });
});
