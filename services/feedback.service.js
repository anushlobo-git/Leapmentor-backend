// backend/services/feedback.service.js
const AppError = require("../utils/AppError");

const feedbackRepo = require("../repositories/feedback.repository");
const connectRequestRepo = require("../repositories/connectRequest.repository");
const mentorProfileRepo = require("../repositories/mentor.repository");

const getParticipantRole = (connectRequest, userId) => {
  const uid = userId.toString();
  if (connectRequest.mentor.toString() === uid) return "mentor";
  if (connectRequest.mentee.toString() === uid) return "mentee";
  return null;
};

const submitFeedback = async ({
  connectRequestId,
  rating,
  comment,
  slotIndex,
  userId,
}) => {
  if (!connectRequestId)
    throw new AppError("connectRequestId is required", 400);
  if (!rating || rating < 1 || rating > 5)
    throw new AppError("rating must be between 1 and 5", 400);

  const connectRequest =
    await connectRequestRepo.findByIdForFeedback(connectRequestId);
  if (!connectRequest) throw new AppError("Session not found", 404);

  const fromRole = getParticipantRole(connectRequest, userId);
  if (!fromRole)
    throw new AppError(
      "Not authorized to submit feedback for this session",
      403,
    );

  if (slotIndex !== undefined && slotIndex !== null) {
    const slot = connectRequest.selectedSlots?.[slotIndex];
    const myMark =
      fromRole === "mentee" ? slot?.menteeMarked : slot?.mentorMarked;
    if (!slot || !myMark)
      throw new AppError(
        "Feedback can only be submitted for completed sessions",
        400,
      );
  } else if (connectRequest.status !== "completed") {
    throw new AppError(
      "Feedback can only be submitted for completed sessions",
      400,
    );
  }

  const toUserId =
    fromRole === "mentor" ? connectRequest.mentee : connectRequest.mentor;

  const existing = await feedbackRepo.findDuplicate({
    connectRequestId,
    userId,
    slotIndex,
  });
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
    ...(slotIndex !== undefined && slotIndex !== null ? { slotIndex } : {}),
  });

  if (fromRole === "mentee") {
    const allFeedback = await feedbackRepo.findAllForRecipient(toUserId);
    const total = allFeedback.reduce((sum, f) => sum + f.rating, 0);
    const newAvgRating = parseFloat((total / allFeedback.length).toFixed(1));
    await mentorProfileRepo.updateAvgRating(toUserId, newAvgRating);
    console.log(`⭐ Updated avgRating for mentor: ${newAvgRating}`);
  }

  const populated = await feedbackRepo.findByIdPopulated(feedback._id);
  return { feedback: populated };
};

const getFeedback = async ({ connectRequestId, userId }) => {
  const connectRequest =
    await connectRequestRepo.findByIdForFeedback(connectRequestId);
  if (!connectRequest) throw new AppError("Session not found", 404);

  const role = getParticipantRole(connectRequest, userId);
  if (!role)
    throw new AppError("Not authorized to view this session's feedback", 403);

  const allFeedback = await feedbackRepo.findAllForSession(connectRequestId);

  const uid = userId.toString();
  const myFeedback =
    allFeedback.find((f) => f.from._id.toString() === uid) || null;
  const theirFeedback =
    allFeedback.find((f) => f.from._id.toString() !== uid) || null;

  return {
    myFeedback,
    theirFeedback: connectRequest.status === "completed" ? theirFeedback : null,
    sessionStatus: connectRequest.status,
  };
};

module.exports = { submitFeedback, getFeedback };
