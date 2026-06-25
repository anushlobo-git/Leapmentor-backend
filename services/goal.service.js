/**
 * @fileoverview Goal Service
 * @description Evaluates roadmap structures, verifies workspace permissions, and manages milestone progression flows.
 */

const AppError = require("../utils/AppError");
const { toGoalDTO } = require("../mappers/goal.mapper");
const { toMilestoneDTO } = require("../mappers/milestone.mapper");

const STATUS_ONGOING = "ongoing";
const GOAL_STATUS_ACTIVE = "active";
const GOAL_STATUS_COMPLETED = "completed";
const GOAL_STATUS_ABANDONED = "abandoned";
const VALID_GOAL_STATUSES = new Set([
  GOAL_STATUS_ACTIVE,
  GOAL_STATUS_COMPLETED,
  GOAL_STATUS_ABANDONED,
]);

const EVENT_GOAL_CREATED = "goal_created";
const EVENT_GOAL_UPDATED = "goal_updated";
const EVENT_MILESTONE_ADDED = "milestone_added";
const EVENT_MILESTONE_UPDATED = "milestone_updated";
const EVENT_MILESTONE_DELETED = "milestone_deleted";

const createGoalService = (
  connectRequestRepo,
  goalRepo,
  milestoneRepo,
  socketHandler,
  logger,
) => {
  const _assertParticipant = (connectRequest, userId) => {
    const mentorId = connectRequest.mentor?._id ?? connectRequest.mentor;
    const menteeId = connectRequest.mentee?._id ?? connectRequest.mentee;
    const uid = userId.toString();

    if (uid !== mentorId.toString() && uid !== menteeId.toString()) {
      throw new AppError("Not authorized", 403);
    }
  };

  const _emitToRoom = (connectRequestId, event, data) => {
    try {
      if (socketHandler.io) {
        socketHandler.io.to(connectRequestId.toString()).emit(event, data);
      }
    } catch (err) {
      logger.error("Socket emit error", { message: err.message });
    }
  };

  const createGoal = async ({
    connectRequestId,
    title,
    description,
    startDate,
    endDate,
    userId,
  }) => {
    if (!connectRequestId)
      throw new AppError("connectRequestId is required", 400);
    if (!title?.trim()) throw new AppError("title is required", 400);

    const session = await connectRequestRepo.findById(connectRequestId);
    if (!session) throw new AppError("Session not found", 404);
    if (session.status !== STATUS_ONGOING) {
      throw new AppError("Goals can only be set for ongoing sessions", 400);
    }

    _assertParticipant(session, userId);

    const existing =
      await goalRepo.findOneByConnectRequestLean(connectRequestId);
    if (existing)
      throw new AppError("A goal already exists for this session", 409);

    const mentorId = session.mentor?._id ?? session.mentor;
    const menteeId = session.mentee?._id ?? session.mentee;

    const goal = await goalRepo.create({
      connectRequest: connectRequestId,
      mentor: mentorId,
      mentee: menteeId,
      title: title.trim(),
      description: description?.trim() || "",
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: userId,
    });

    const mappedGoal = toGoalDTO(goal);
    _emitToRoom(connectRequestId, EVENT_GOAL_CREATED, { goal: mappedGoal });

    return mappedGoal;
  };

  const getGoalByConnection = async (connectRequestId, userId) => {
    const session = await connectRequestRepo.findById(connectRequestId);
    if (!session) throw new AppError("Session not found", 404);

    _assertParticipant(session, userId);

    const goal = await goalRepo.findOneByConnectRequestLean(connectRequestId);
    if (!goal) return { goal: null, milestones: [] };

    const milestones = await milestoneRepo.findAllByGoalSorted(goal._id);
    return {
      goal: toGoalDTO(goal),
      milestones: milestones.map(toMilestoneDTO),
    };
  };

  const updateGoal = async ({
    goalId,
    title,
    description,
    startDate,
    endDate,
    status,
    userId,
  }) => {
    const goal = await goalRepo.findById(goalId);
    if (!goal) throw new AppError("Goal not found", 404);

    const session = await connectRequestRepo.findById(goal.connectRequest);
    _assertParticipant(session, userId);

    if (title !== undefined) {
      if (!title.trim()) throw new AppError("title cannot be empty", 400);
      goal.title = title.trim();
    }
    if (description !== undefined) goal.description = description.trim();
    if (startDate !== undefined) goal.startDate = startDate || null;
    if (endDate !== undefined) goal.endDate = endDate || null;

    if (status !== undefined) {
      if (!VALID_GOAL_STATUSES.has(status))
        throw new AppError("Invalid status", 400);
      goal.status = status;
    }

    await goalRepo.save(goal);

    const mappedGoal = toGoalDTO(goal);
    _emitToRoom(goal.connectRequest, EVENT_GOAL_UPDATED, { goal: mappedGoal });

    return mappedGoal;
  };

  const createMilestone = async ({
    goalId,
    title,
    description,
    dueDate,
    userId,
  }) => {
    const goal = await goalRepo.findById(goalId);
    if (!goal) throw new AppError("Goal not found", 404);

    const session = await connectRequestRepo.findById(goal.connectRequest);
    _assertParticipant(session, userId);

    if (!title?.trim()) throw new AppError("title is required", 400);

    const lastMilestone = await milestoneRepo.findLastMilestone(goal._id);
    const order = lastMilestone ? lastMilestone.order + 1 : 0;

    const milestone = await milestoneRepo.create({
      goal: goal._id,
      connectRequest: goal.connectRequest,
      title: title.trim(),
      description: description?.trim() || "",
      dueDate: dueDate || null,
      order,
    });

    const mappedMilestone = toMilestoneDTO(milestone);
    _emitToRoom(goal.connectRequest, EVENT_MILESTONE_ADDED, {
      milestone: mappedMilestone,
    });

    return mappedMilestone;
  };

  const updateMilestone = async ({
    milestoneId,
    title,
    description,
    isCompleted,
    userId,
  }) => {
    const milestone = await milestoneRepo.findById(milestoneId);
    if (!milestone) throw new AppError("Milestone not found", 404);

    const session = await connectRequestRepo.findById(milestone.connectRequest);
    _assertParticipant(session, userId);

    if (title !== undefined) {
      if (!title.trim()) throw new AppError("title cannot be empty", 400);
      milestone.title = title.trim();
    }
    if (description !== undefined) milestone.description = description.trim();

    if (isCompleted !== undefined) {
      milestone.isCompleted = isCompleted;
      milestone.completedAt = isCompleted ? new Date() : null;
      milestone.completedBy = isCompleted ? userId : null;
    }

    await milestoneRepo.save(milestone);

    const mappedMilestone = toMilestoneDTO(milestone);
    _emitToRoom(milestone.connectRequest, EVENT_MILESTONE_UPDATED, {
      milestone: mappedMilestone,
    });

    return mappedMilestone;
  };

  const deleteMilestone = async (milestoneId, userId) => {
    const milestone = await milestoneRepo.findById(milestoneId);
    if (!milestone) throw new AppError("Milestone not found", 404);

    const session = await connectRequestRepo.findById(milestone.connectRequest);
    _assertParticipant(session, userId);

    const connectRequestId = milestone.connectRequest;
    await milestoneRepo.deleteById(milestoneId);

    _emitToRoom(connectRequestId, EVENT_MILESTONE_DELETED, { milestoneId });

    return milestoneId;
  };

  return {
    createGoal,
    getGoalByConnection,
    updateGoal,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  };
};

module.exports = createGoalService;
