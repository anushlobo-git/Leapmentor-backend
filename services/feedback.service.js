/**
 * @fileoverview Feedback Service
 * @description Evaluates rules for submitting peer assessments across completed sessions and calculates updated ratings.
 */
const AppError = require("../utils/AppError");

// Repositories
const feedbackRepo = require("../repositories/feedback.repository");
const connectRequestRepo = require("../repositories/connectRequest.repository");
const mentorProfileRepo = require("../repositories/mentor.repository");

// Constants
const MIN_RATING = 1;
const MAX_RATING = 5;
const ROLE_MENTEE = "mentee";
const ROLE_MENTOR = "mentor";
const STATUS_COMPLETED = "completed";

/**
 * Evaluates, processes, and stores a new peer feedback assessment submission.
 * @description Validates structural bounds, assesses relative slot execution markings,
 * enforces strict duplicate prevention, and dynamically recalibrates
 * global mentor rating scores if submitted by a mentee.
 * @param {Object} params Execution parameters payload.
 * @param {string} params.connectRequestId Unique connection session index.
 * @param {number} params.rating Intended aggregate evaluation scale marker.
 * @param {string} [params.comment] Explicit descriptive performance review statement text.
 * @param {number} [params.slotIndex] Specific tracking index corresponding to individual milestone sub-slots.
 * @param {string} params.userId Actor ID generating the submission.
 * @throws {AppError} 400 | 403 | 404 | 409
 * @returns {Promise<Object>} Populated feedback asset state database metrics block.
 */
const createFeedback = async ({
  connectRequestId,
  rating,
  comment,
  slotIndex,
  userId,
}) => {
  if (!connectRequestId)
    throw new AppError("connectRequestId is required", 400);
  if (!rating || rating < MIN_RATING || rating > MAX_RATING) {
    throw new AppError(
      `rating must be between ${MIN_RATING} and ${MAX_RATING}`,
      400,
    );
  }

  const connectRequest =
    await connectRequestRepo.findByIdForFeedback(connectRequestId);
  if (!connectRequest) throw new AppError("Session not found", 404);

  const fromRole = _deriveParticipantRole(connectRequest, userId);
  if (!fromRole)
    throw new AppError(
      "Not authorized to submit feedback for this session",
      403,
    );

  _validateSessionCompletion(connectRequest, fromRole, slotIndex);

  const toUserId =
    fromRole === ROLE_MENTOR ? connectRequest.mentee : connectRequest.mentor;
  const isSlotContext = slotIndex !== undefined && slotIndex !== null;

  const duplicateQuery = {
    connectRequest: connectRequestId,
    from: userId,
    ...(isSlotContext ? { slotIndex } : {}),
  };

  const existing = await feedbackRepo.findOne(duplicateQuery);
  if (existing)
    throw new AppError(
      "You have already submitted feedback for this session",
      409,
    );

  const feedback = await feedbackRepo.create({
    connectRequest: connectRequestId,
    from: userId,
    to: toUserId,
    fromRole,
    rating,
    comment: comment?.trim() || "",
    ...(isSlotContext ? { slotIndex } : {}),
  });

  if (fromRole === ROLE_MENTEE) {
    await _recalculateMentorAvgRating(toUserId);
  }

  return await feedbackRepo.findByIdAndPopulateParticipants(feedback._id);
};

/**
 * Returns structured feedback metrics specific to a single session context block.
 * @param {string} connectRequestId Core resource configuration verification identity tracking tag.
 * @param {string} userId Requesting user passport verification signature map tracking context.
 * @throws {AppError} 403 | 404
 * @returns {Promise<Object>} Formatted object matching symmetric participant states.
 */
const getFeedback = async (connectRequestId, userId) => {
  const connectRequest =
    await connectRequestRepo.findByIdForFeedback(connectRequestId);
  if (!connectRequest) throw new AppError("Session not found", 404);

  const role = _deriveParticipantRole(connectRequest, userId);
  if (!role)
    throw new AppError("Not authorized to view this session's feedback", 403);

  const allFeedback =
    await feedbackRepo.findAllByConnectRequest(connectRequestId);
  const myFeedback =
    allFeedback.find((f) => f.from._id.toString() === userId.toString()) ||
    null;
  const theirFeedback =
    allFeedback.find((f) => f.from._id.toString() !== userId.toString()) ||
    null;

  return {
    myFeedback,
    theirFeedback:
      connectRequest.status === STATUS_COMPLETED ? theirFeedback : null,
    sessionStatus: connectRequest.status,
  };
};

/**
 * Identifies and isolates specific role bindings relative to explicit session mappings.
 * @private
 */
const _deriveParticipantRole = (connectRequest, userId) => {
  const uid = userId.toString();
  if (connectRequest.mentor.toString() === uid) return ROLE_MENTOR;
  if (connectRequest.mentee.toString() === uid) return ROLE_MENTEE;
  return null;
};

/**
 * Guard evaluation block checking target workflow items against performance states.
 * @private
 */
const _validateSessionCompletion = (connectRequest, fromRole, slotIndex) => {
  if (slotIndex !== undefined && slotIndex !== null) {
    const slot = connectRequest.selectedSlots?.[slotIndex];
    const myMark =
      fromRole === ROLE_MENTEE ? slot?.menteeMarked : slot?.mentorMarked;

    if (!slot || !myMark) {
      throw new AppError(
        "Feedback can only be submitted for completed sessions",
        400,
      );
    }
    return;
  }

  if (connectRequest.status !== STATUS_COMPLETED) {
    throw new AppError(
      "Feedback can only be submitted for completed sessions",
      400,
    );
  }
};

/**
 * Aggregates all global incoming ledger marks shifting overall profile stats calculations.
 * @private
 */
const _recalculateMentorAvgRating = async (mentorUserId) => {
  const allMentorFeedback =
    await feedbackRepo.findAllByTargetUser(mentorUserId);
  if (!allMentorFeedback.length) return;

  const totalRatings = allMentorFeedback.reduce((sum, f) => sum + f.rating, 0);
  const newAvgRating = parseFloat(
    (totalRatings / allMentorFeedback.length).toFixed(1),
  );

  await mentorProfileRepo.updateAvgRating(mentorUserId, newAvgRating);
};

module.exports = {
  createFeedback,
  getFeedback,
};
