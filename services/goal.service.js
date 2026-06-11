/**
 * @fileoverview Goal Service
 * @description Evaluates roadmap structures, verifies workspace permissions, and manages milestone progression flows.
 */
const AppError = require("../utils/AppError");
const socketHandler = require("../socket/socketHandler");

// Repositories
const connectRequestRepo = require("../repositories/connectRequest.repository");
const goalRepo = require("../repositories/goal.repository");
const milestoneRepo = require("../repositories/milestone.repository");

// Upper-case Domain Constants
const STATUS_ONGOING = "ongoing";
const GOAL_STATUS_ACTIVE = "active";
const GOAL_STATUS_COMPLETED = "completed";
const GOAL_STATUS_ABANDONED = "abandoned";
const VALID_GOAL_STATUSES = [
  GOAL_STATUS_ACTIVE,
  GOAL_STATUS_COMPLETED,
  GOAL_STATUS_ABANDONED,
];

// Real-Time Event Event Constants
const EVENT_GOAL_CREATED = "goal_created";
const EVENT_GOAL_UPDATED = "goal_updated";
const EVENT_MILESTONE_ADDED = "milestone_added";
const EVENT_MILESTONE_UPDATED = "milestone_updated";
const EVENT_MILESTONE_DELETED = "milestone_deleted";

/**
 * Establishes a brand new outcome objective matrix targeting an ongoing engagement contract.
 * @param {Object} params Operational execution configurations map.
 * @param {string} params.connectRequestId Identity index key of the parent session agreement.
 * @param {string} params.title Comprehensive naming title representing the target milestone focus.
 * @param {string} [params.description] Explicit descriptive summary context details.
 * @param {string|Date} [params.startDate] Starting target boundary window configuration.
 * @param {string|Date} [params.endDate] Final estimated delivery time constraint point.
 * @param {string} params.userId Actor ID generating the baseline request.
 * @throws {AppError} 400 | 403 | 404 | 409
 * @returns {Promise<Object>} Persisted target outcome document payload properties.
 */
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
  if (session.status !== STATUS_ONGOING)
    throw new AppError("Goals can only be set for ongoing sessions", 400);

  _assertParticipant(session, userId);

  const existing = await goalRepo.findOneByConnectRequestLean(connectRequestId);
  if (existing)
    throw new AppError("A goal already exists for this session", 409);

  const goal = await goalRepo.create({
    connectRequest: connectRequestId,
    mentor: session.mentor,
    mentee: session.mentee,
    title: title.trim(),
    description: description?.trim() || "",
    startDate: startDate || null,
    endDate: endDate || null,
    createdBy: userId,
  });

  _emitToRoom(connectRequestId, EVENT_GOAL_CREATED, { goal });

  return goal;
};

/**
 * Returns structured milestone lists mapped together natively against matching core goals.
 * @param {string} connectRequestId Verification token targeting parent configuration blocks.
 * @param {string} userId Requesting workspace profile tracking credential map.
 * @throws {AppError} 403 | 404
 * @returns {Promise<Object>} Synced objectives and milestones sub-arrays array mapping.
 */
const getGoalByConnection = async (connectRequestId, userId) => {
  const session = await connectRequestRepo.findById(connectRequestId);
  if (!session) throw new AppError("Session not found", 404);

  _assertParticipant(session, userId);

  const goal = await goalRepo.findOneByConnectRequestLean(connectRequestId);
  if (!goal) {
    return { goal: null, milestones: [] };
  }

  const milestones = await milestoneRepo.findAllByGoalSorted(goal._id);

  return { goal, milestones };
};

/**
 * Modifies parameters managing master outcomes tracks.
 * @param {Object} params Update metrics maps payload track properties.
 * @param {string} params.goalId Precise model primary structural identity reference selector keys.
 * @param {string} [params.title] Modified title statement data metrics adjustment bounds.
 * @param {string} [params.description] Descriptive metadata block summary text corrections.
 * @param {string|Date} [params.startDate] Shifting calendar tracking points.
 * @param {string|Date} [params.endDate] Rearranged closing roadmap bounds.
 * @param {string} [params.status] Target performance level changes.
 * @param {string} params.userId Modifier account security identification trace context tracker.
 * @throws {AppError} 400 | 403 | 404
 * @returns {Promise<Object>} Updated objective target document tracking asset structures.
 */
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
    if (!VALID_GOAL_STATUSES.includes(status))
      throw new AppError("Invalid status", 400);
    goal.status = status;
  }

  await goalRepo.save(goal);

  _emitToRoom(goal.connectRequest, EVENT_GOAL_UPDATED, { goal });

  return goal;
};

/**
 * appends customized checkpoint elements down inside targeting parent goal tracks.
 * @param {Object} params Allocation criteria map components variables tracking profiles.
 * @param {string} params.goalId Target parent reference indicator indexing structure mappings.
 * @param {string} params.title Specific criteria naming text assignments.
 * @param {string} [params.description] Functional process roadmap item descriptions.
 * @param {string|Date} [params.dueDate] Segment milestone target time frame bounds point.
 * @param {string} params.userId Actor context mapping confirmation flags profiles.
 * @throws {AppError} 400 | 403 | 404
 * @returns {Promise<Object>} Added milestone data object tracking configuration matrices arrays.
 */
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

  _emitToRoom(goal.connectRequest, EVENT_MILESTONE_ADDED, { milestone });

  return milestone;
};

/**
 * Edits operational criteria describing tracking checkpoints performance state values.
 * @param {Object} params Identification parameter mappings payload bounds tracing arrays.
 * @param {string} params.milestoneId Database context resource location identifier coordinate key mapping.
 * @param {string} [params.title] Alternate naming updates applied into the milestone parameters.
 * @param {string} [params.description] Narrative details summaries changes targets fields entries.
 * @param {boolean} [params.isCompleted] True/False assessment flag verifying target milestone execution success.
 * @param {string} params.userId Acting credential assignment reference tracking profile credentials mapping maps.
 * @throws {AppError} 400 | 403 | 404
 * @returns {Promise<Object>} Persisted updated milestone document profile instance state maps.
 */
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

  _emitToRoom(milestone.connectRequest, EVENT_MILESTONE_UPDATED, { milestone });

  return milestone;
};

/**
 * Completely purges structural checkpoint records from system database tracking sheets.
 * @param {string} milestoneId Targeted milestone entity tracking location index key mapping.
 * @param {string} userId Execution identity parameter token verification signature checklist.
 * @throws {AppError} 403 | 404
 * @returns {Promise<string>} Omitted tracking identity block structural reference string.
 */
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

/**
 * Private permissions guard evaluating participant authorization bounds.
 * @private
 */
const _assertParticipant = (connectRequest, userId) => {
  const mentorId = connectRequest.mentor.toString();
  const menteeId = connectRequest.mentee.toString();
  const uid = userId.toString();

  if (uid !== mentorId && uid !== menteeId) {
    throw new AppError("Not authorized", 403);
  }
};

/**
 * Socket pipeline wrapper dispatching structural updates out to relevant connection channel rooms.
 * @private
 */
const _emitToRoom = (connectRequestId, event, data) => {
  try {
    if (socketHandler.io) {
      socketHandler.io.to(connectRequestId.toString()).emit(event, data);
    }
  } catch (err) {
    console.error("❌ Socket emit error:", err.message);
  }
};

module.exports = {
  createGoal,
  getGoalByConnection,
  updateGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
};
