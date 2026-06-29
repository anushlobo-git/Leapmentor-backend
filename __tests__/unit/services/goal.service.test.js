/**
 * @fileoverview Goal Service Unit Tests
 * @description Full branch coverage for createGoal, getGoalByConnection, updateGoal,
 * createMilestone, updateMilestone, deleteMilestone, _assertParticipant, and _emitToRoom.
 */

const createGoalService = require("../../../services/goal.service");

jest.mock("../../../mappers/goal.mapper", () => ({
  toGoalDTO: jest.fn((val) => ({ isGoalDTO: true, ...val })),
}));
jest.mock("../../../mappers/milestone.mapper", () => ({
  toMilestoneDTO: jest.fn((val) => ({ isMilestoneDTO: true, ...val })),
}));

describe("Goal Service Unit Tests", () => {
  let mockConnectRepo,
    mockGoalRepo,
    mockMilestoneRepo,
    mockSocket,
    mockLogger,
    service;

  const ongoingSession = {
    status: "ongoing",
    mentor: "mentor_id",
    mentee: "mentee_id",
  };

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
      deleteById: jest.fn(),
    };
    mockSocket = { io: { to: jest.fn(() => ({ emit: jest.fn() })) } };
    mockLogger = { error: jest.fn() };

    service = createGoalService({
      connectRequestRepo: mockConnectRepo,
      goalRepo: mockGoalRepo,
      milestoneRepo: mockMilestoneRepo,
      socketHandler: mockSocket,
      logger: mockLogger,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // createGoal
  // ---------------------------------------------------------------------------
  describe("createGoal", () => {
    test("should throw 400 when connectRequestId is missing", async () => {
      await expect(
        service.createGoal({ title: "My Goal", userId: "mentor_id" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "connectRequestId is required",
      });
    });

    test("should throw 400 when title is missing or blank", async () => {
      await expect(
        service.createGoal({
          connectRequestId: "c1",
          title: "   ",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "title is required",
      });

      await expect(
        service.createGoal({ connectRequestId: "c1", userId: "mentor_id" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "title is required",
      });
    });

    test("should throw 404 when session is not found", async () => {
      mockConnectRepo.findById.mockResolvedValue(null);

      await expect(
        service.createGoal({
          connectRequestId: "c1",
          title: "Goal",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Session not found",
      });
    });

    test("should throw 400 when session status is not ongoing", async () => {
      mockConnectRepo.findById.mockResolvedValue({
        ...ongoingSession,
        status: "completed",
      });

      await expect(
        service.createGoal({
          connectRequestId: "c1",
          title: "Goal",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Goals can only be set for ongoing sessions",
      });
    });

    test("should throw 403 when user is not a participant", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.createGoal({
          connectRequestId: "c1",
          title: "Goal",
          userId: "intruder",
        }),
      ).rejects.toMatchObject({ statusCode: 403, message: "Not authorized" });
    });

    test("should throw 409 when a goal already exists for this session", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue({
        _id: "existing_goal",
      });

      await expect(
        service.createGoal({
          connectRequestId: "c1",
          title: "Goal",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "A goal already exists for this session",
      });
    });

    test("should resolve mentor/mentee from populated objects (_id ?? plain) and create goal", async () => {
      const populatedSession = {
        status: "ongoing",
        mentor: { _id: "mentor_id" }, // populated object
        mentee: { _id: "mentee_id" }, // populated object
      };
      mockConnectRepo.findById.mockResolvedValue(populatedSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue(null);
      mockGoalRepo.create.mockResolvedValue({ _id: "goal_1", title: "Goal" });

      const result = await service.createGoal({
        connectRequestId: "c1",
        title: "  Goal  ",
        userId: "mentor_id",
      });

      expect(mockGoalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mentor: "mentor_id",
          mentee: "mentee_id",
          title: "Goal",
        }),
      );
      expect(result.isGoalDTO).toBe(true);
    });

    test("should use empty string for missing description and null for missing startDate/endDate", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue(null);
      mockGoalRepo.create.mockResolvedValue({ _id: "goal_2", title: "Goal" });

      await service.createGoal({
        connectRequestId: "c1",
        title: "Goal",
        userId: "mentor_id",
        // description, startDate, endDate intentionally omitted
      });

      expect(mockGoalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "",
          startDate: null,
          endDate: null,
        }),
      );
    });

    test("should use provided startDate/endDate and description when supplied", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue(null);
      mockGoalRepo.create.mockResolvedValue({ _id: "goal_3", title: "Goal" });

      await service.createGoal({
        connectRequestId: "c1",
        title: "Goal",
        userId: "mentor_id",
        description: "  A great goal  ",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });

      expect(mockGoalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "A great goal",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        }),
      );
    });

    test("should emit goal_created socket event after creation", async () => {
      const emitMock = jest.fn();
      mockSocket.io.to.mockReturnValue({ emit: emitMock });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue(null);
      mockGoalRepo.create.mockResolvedValue({ _id: "goal_4", title: "Goal" });

      await service.createGoal({
        connectRequestId: "c1",
        title: "Goal",
        userId: "mentor_id",
      });

      expect(mockSocket.io.to).toHaveBeenCalledWith("c1");
      expect(emitMock).toHaveBeenCalledWith("goal_created", expect.any(Object));
    });
  });

  // ---------------------------------------------------------------------------
  // _emitToRoom edge cases
  // ---------------------------------------------------------------------------
  describe("_emitToRoom", () => {
    test("should skip emit silently when socketHandler.io is falsy", async () => {
      // Replace service with one that has no io
      const noIoService = createGoalService({
        connectRequestRepo: mockConnectRepo,
        goalRepo: mockGoalRepo,
        milestoneRepo: mockMilestoneRepo,
        socketHandler: { io: null },
        logger: mockLogger,
      });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue(null);
      mockGoalRepo.create.mockResolvedValue({ _id: "goal_5", title: "Goal" });

      // Should not throw
      await expect(
        noIoService.createGoal({
          connectRequestId: "c1",
          title: "Goal",
          userId: "mentor_id",
        }),
      ).resolves.toBeDefined();
    });

    test("should log error when socket emit throws", async () => {
      mockSocket.io.to.mockImplementation(() => {
        throw new Error("socket boom");
      });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue(null);
      mockGoalRepo.create.mockResolvedValue({ _id: "goal_6", title: "Goal" });

      // Should not throw — error is caught and logged
      await service.createGoal({
        connectRequestId: "c1",
        title: "Goal",
        userId: "mentor_id",
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Socket emit error",
        expect.objectContaining({ message: "socket boom" }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getGoalByConnection
  // ---------------------------------------------------------------------------
  describe("getGoalByConnection", () => {
    test("should throw 404 when session is not found", async () => {
      mockConnectRepo.findById.mockResolvedValue(null);

      await expect(
        service.getGoalByConnection("c1", "mentor_id"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Session not found",
      });
    });

    test("should throw 403 when user is not a participant", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.getGoalByConnection("c1", "intruder"),
      ).rejects.toMatchObject({ statusCode: 403, message: "Not authorized" });
    });

    test("should return { goal: null, milestones: [] } when no goal exists", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue(null);

      const result = await service.getGoalByConnection("c1", "mentor_id");

      expect(result).toEqual({ goal: null, milestones: [] });
    });

    test("should return mapped goal and milestones when goal exists", async () => {
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.findOneByConnectRequestLean.mockResolvedValue({
        _id: "goal_1",
      });
      mockMilestoneRepo.findAllByGoalSorted.mockResolvedValue([
        { _id: "ms_1" },
        { _id: "ms_2" },
      ]);

      const result = await service.getGoalByConnection("c1", "mentee_id");

      expect(result.goal.isGoalDTO).toBe(true);
      expect(result.milestones).toHaveLength(2);
      expect(result.milestones[0].isMilestoneDTO).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // updateGoal
  // ---------------------------------------------------------------------------
  describe("updateGoal", () => {
    const existingGoal = {
      _id: "goal_1",
      connectRequest: "c1",
      title: "Old Title",
      description: "Old desc",
      startDate: null,
      endDate: null,
      status: "active",
    };

    test("should throw 404 when goal is not found", async () => {
      mockGoalRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateGoal({ goalId: "bad_id", userId: "mentor_id" }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Goal not found" });
    });

    test("should throw 403 when user is not a participant", async () => {
      mockGoalRepo.findById.mockResolvedValue({ ...existingGoal });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.updateGoal({
          goalId: "goal_1",
          title: "New",
          userId: "intruder",
        }),
      ).rejects.toMatchObject({ statusCode: 403, message: "Not authorized" });
    });

    test("should throw 400 when title is provided but blank", async () => {
      mockGoalRepo.findById.mockResolvedValue({ ...existingGoal });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.updateGoal({
          goalId: "goal_1",
          title: "   ",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "title cannot be empty",
      });
    });

    test("should throw 400 when status is invalid", async () => {
      mockGoalRepo.findById.mockResolvedValue({ ...existingGoal });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.updateGoal({
          goalId: "goal_1",
          status: "bogus",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid status" });
    });

    test("should update all provided fields and save", async () => {
      const goal = { ...existingGoal };
      mockGoalRepo.findById.mockResolvedValue(goal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.save.mockResolvedValue();

      const result = await service.updateGoal({
        goalId: "goal_1",
        title: "  New Title  ",
        description: "  New desc  ",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        status: "completed",
        userId: "mentor_id",
      });

      expect(goal.title).toBe("New Title");
      expect(goal.description).toBe("New desc");
      expect(goal.startDate).toBe("2026-01-01");
      expect(goal.endDate).toBe("2026-12-31");
      expect(goal.status).toBe("completed");
      expect(mockGoalRepo.save).toHaveBeenCalledWith(goal);
      expect(result.isGoalDTO).toBe(true);
    });

    test("should set startDate and endDate to null when falsy values are provided", async () => {
      const goal = {
        ...existingGoal,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      };
      mockGoalRepo.findById.mockResolvedValue(goal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.save.mockResolvedValue();

      await service.updateGoal({
        goalId: "goal_1",
        startDate: "", // falsy → null
        endDate: null, // falsy → null
        userId: "mentor_id",
      });

      expect(goal.startDate).toBeNull();
      expect(goal.endDate).toBeNull();
    });

    test("should skip all field updates when no fields are passed (no-op)", async () => {
      const goal = { ...existingGoal };
      mockGoalRepo.findById.mockResolvedValue(goal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockGoalRepo.save.mockResolvedValue();

      await service.updateGoal({ goalId: "goal_1", userId: "mentor_id" });

      // Fields unchanged
      expect(goal.title).toBe("Old Title");
      expect(goal.description).toBe("Old desc");
      expect(mockGoalRepo.save).toHaveBeenCalled();
    });

    test("should accept all three valid statuses: active, completed, abandoned", async () => {
      for (const status of ["active", "completed", "abandoned"]) {
        const goal = { ...existingGoal };
        mockGoalRepo.findById.mockResolvedValue(goal);
        mockConnectRepo.findById.mockResolvedValue(ongoingSession);
        mockGoalRepo.save.mockResolvedValue();

        await service.updateGoal({
          goalId: "goal_1",
          status,
          userId: "mentor_id",
        });
        expect(goal.status).toBe(status);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // createMilestone
  // ---------------------------------------------------------------------------
  describe("createMilestone", () => {
    const existingGoal = { _id: "goal_1", connectRequest: "c1" };

    test("should throw 404 when goal is not found", async () => {
      mockGoalRepo.findById.mockResolvedValue(null);

      await expect(
        service.createMilestone({
          goalId: "bad_id",
          title: "MS",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Goal not found" });
    });

    test("should throw 403 when user is not a participant", async () => {
      mockGoalRepo.findById.mockResolvedValue(existingGoal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.createMilestone({
          goalId: "goal_1",
          title: "MS",
          userId: "intruder",
        }),
      ).rejects.toMatchObject({ statusCode: 403, message: "Not authorized" });
    });

    test("should throw 400 when title is missing or blank", async () => {
      mockGoalRepo.findById.mockResolvedValue(existingGoal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.createMilestone({
          goalId: "goal_1",
          title: "  ",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "title is required",
      });

      await expect(
        service.createMilestone({ goalId: "goal_1", userId: "mentor_id" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "title is required",
      });
    });

    test("should set order to 0 when no previous milestone exists", async () => {
      mockGoalRepo.findById.mockResolvedValue(existingGoal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.findLastMilestone.mockResolvedValue(null); // no previous
      mockMilestoneRepo.create.mockResolvedValue({
        _id: "ms_1",
        title: "First",
      });

      await service.createMilestone({
        goalId: "goal_1",
        title: "First",
        userId: "mentor_id",
      });

      expect(mockMilestoneRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 0 }),
      );
    });

    test("should set order to lastMilestone.order + 1 when a previous milestone exists", async () => {
      mockGoalRepo.findById.mockResolvedValue(existingGoal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.findLastMilestone.mockResolvedValue({ order: 4 }); // order + 1 = 5
      mockMilestoneRepo.create.mockResolvedValue({
        _id: "ms_2",
        title: "Next",
      });

      await service.createMilestone({
        goalId: "goal_1",
        title: "Next",
        userId: "mentor_id",
      });

      expect(mockMilestoneRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 5 }),
      );
    });

    test("should use empty string for missing description and null for missing dueDate", async () => {
      mockGoalRepo.findById.mockResolvedValue(existingGoal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.findLastMilestone.mockResolvedValue(null);
      mockMilestoneRepo.create.mockResolvedValue({ _id: "ms_3", title: "MS" });

      await service.createMilestone({
        goalId: "goal_1",
        title: "MS",
        userId: "mentor_id",
      });

      expect(mockMilestoneRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: "", dueDate: null }),
      );
    });

    test("should use provided description (trimmed) and dueDate", async () => {
      mockGoalRepo.findById.mockResolvedValue(existingGoal);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.findLastMilestone.mockResolvedValue(null);
      mockMilestoneRepo.create.mockResolvedValue({ _id: "ms_4", title: "MS" });

      await service.createMilestone({
        goalId: "goal_1",
        title: "MS",
        description: "  Details  ",
        dueDate: "2026-06-30",
        userId: "mentor_id",
      });

      expect(mockMilestoneRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Details",
          dueDate: "2026-06-30",
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateMilestone
  // ---------------------------------------------------------------------------
  describe("updateMilestone", () => {
    const existingMilestone = {
      _id: "ms_1",
      connectRequest: "c1",
      title: "Old",
      description: "Old desc",
      isCompleted: false,
      completedAt: null,
      completedBy: null,
    };

    test("should throw 404 when milestone is not found", async () => {
      mockMilestoneRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateMilestone({ milestoneId: "bad_id", userId: "mentor_id" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Milestone not found",
      });
    });

    test("should throw 403 when user is not a participant", async () => {
      mockMilestoneRepo.findById.mockResolvedValue({ ...existingMilestone });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.updateMilestone({
          milestoneId: "ms_1",
          title: "X",
          userId: "intruder",
        }),
      ).rejects.toMatchObject({ statusCode: 403, message: "Not authorized" });
    });

    test("should throw 400 when title is provided but blank", async () => {
      mockMilestoneRepo.findById.mockResolvedValue({ ...existingMilestone });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.updateMilestone({
          milestoneId: "ms_1",
          title: "  ",
          userId: "mentor_id",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "title cannot be empty",
      });
    });

    test("should set completedAt and completedBy when isCompleted=true", async () => {
      const ms = { ...existingMilestone };
      mockMilestoneRepo.findById.mockResolvedValue(ms);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.save.mockResolvedValue();

      await service.updateMilestone({
        milestoneId: "ms_1",
        isCompleted: true,
        userId: "mentor_id",
      });

      expect(ms.isCompleted).toBe(true);
      expect(ms.completedAt).toBeInstanceOf(Date);
      expect(ms.completedBy).toBe("mentor_id");
    });

    test("should null out completedAt and completedBy when isCompleted=false", async () => {
      const ms = {
        ...existingMilestone,
        isCompleted: true,
        completedAt: new Date(),
        completedBy: "mentor_id",
      };
      mockMilestoneRepo.findById.mockResolvedValue(ms);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.save.mockResolvedValue();

      await service.updateMilestone({
        milestoneId: "ms_1",
        isCompleted: false,
        userId: "mentor_id",
      });

      expect(ms.isCompleted).toBe(false);
      expect(ms.completedAt).toBeNull();
      expect(ms.completedBy).toBeNull();
    });

    test("should skip isCompleted block entirely when isCompleted is undefined", async () => {
      const ms = { ...existingMilestone };
      mockMilestoneRepo.findById.mockResolvedValue(ms);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.save.mockResolvedValue();

      await service.updateMilestone({
        milestoneId: "ms_1",
        title: "Updated",
        userId: "mentor_id",
        // isCompleted intentionally omitted
      });

      expect(ms.completedAt).toBeNull(); // unchanged
      expect(ms.completedBy).toBeNull(); // unchanged
      expect(ms.title).toBe("Updated");
    });

    test("should update description when provided", async () => {
      const ms = { ...existingMilestone };
      mockMilestoneRepo.findById.mockResolvedValue(ms);
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.save.mockResolvedValue();

      await service.updateMilestone({
        milestoneId: "ms_1",
        description: "  New desc  ",
        userId: "mentor_id",
      });

      expect(ms.description).toBe("New desc");
    });
  });

  // ---------------------------------------------------------------------------
  // deleteMilestone
  // ---------------------------------------------------------------------------
  describe("deleteMilestone", () => {
    test("should throw 404 when milestone is not found", async () => {
      mockMilestoneRepo.findById.mockResolvedValue(null);

      await expect(
        service.deleteMilestone("bad_id", "mentor_id"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Milestone not found",
      });
    });

    test("should throw 403 when user is not a participant", async () => {
      mockMilestoneRepo.findById.mockResolvedValue({
        _id: "ms_1",
        connectRequest: "c1",
      });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);

      await expect(
        service.deleteMilestone("ms_1", "intruder"),
      ).rejects.toMatchObject({ statusCode: 403, message: "Not authorized" });
    });

    test("should delete milestone, emit socket event, and return milestoneId", async () => {
      const emitMock = jest.fn();
      mockSocket.io.to.mockReturnValue({ emit: emitMock });
      mockMilestoneRepo.findById.mockResolvedValue({
        _id: "ms_1",
        connectRequest: "c1",
      });
      mockConnectRepo.findById.mockResolvedValue(ongoingSession);
      mockMilestoneRepo.deleteById.mockResolvedValue();

      const result = await service.deleteMilestone("ms_1", "mentor_id");

      expect(mockMilestoneRepo.deleteById).toHaveBeenCalledWith("ms_1");
      expect(emitMock).toHaveBeenCalledWith("milestone_deleted", {
        milestoneId: "ms_1",
      });
      expect(result).toBe("ms_1");
    });
  });
});
