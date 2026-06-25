const createGoalService = require("../../../services/goal.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/goal.mapper", () => ({ toGoalDTO: (val) => val }));
jest.mock("../../../mappers/milestone.mapper", () => ({
  toMilestoneDTO: (val) => val,
}));

describe("Goal Service Unit Tests", () => {
  let mockConnectRepo,
    mockGoalRepo,
    mockMilestoneRepo,
    mockSocket,
    mockLogger,
    service;

  beforeEach(() => {
    mockConnectRepo = { findById: jest.fn() };
    mockGoalRepo = {
      findOneByConnectRequestLean: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    mockMilestoneRepo = {
      findAllByGoalSorted: jest.fn(),
      findLastMilestone: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    mockSocket = { io: { to: jest.fn(() => ({ emit: jest.fn() })) } };
    mockLogger = { error: jest.fn() };

    service = createGoalService(
      mockConnectRepo,
      mockGoalRepo,
      mockMilestoneRepo,
      mockSocket,
      mockLogger,
    );
  });

  test("createGoal should throw a 403 authorization error if requesting user is an unlinked third party", async () => {
    mockConnectRepo.findById.mockResolvedValue({
      status: "ongoing",
      mentor: "mentor_123",
      mentee: "mentee_456",
    });

    await expect(
      service.createGoal({
        connectRequestId: "session_01",
        title: "Learn DI",
        userId: "malicious_user",
      }),
    ).rejects.toThrow(new AppError("Not authorized", 403));
  });

  test("createGoal should fail if a structural tracking template already exists on the connection", async () => {
    mockConnectRepo.findById.mockResolvedValue({
      status: "ongoing",
      mentor: "m_1",
      mentee: "m_2",
    });
    mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue({
      _id: "preexisting_id",
    });

    await expect(
      service.createGoal({
        connectRequestId: "session_01",
        title: "New Title",
        userId: "m_1",
      }),
    ).rejects.toThrow(
      new AppError("A goal already exists for this session", 409),
    );
  });
});
