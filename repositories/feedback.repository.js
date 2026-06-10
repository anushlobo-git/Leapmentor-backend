// backend/repositories/feedback.repository.js
// ── Touches ONLY the Feedback model ───────────────────────────
const Feedback = require("../models/Feedback");

// Check for an existing submission — scoped to slot if provided
const findDuplicate = ({ connectRequestId, userId, slotIndex }) =>
  Feedback.findOne({
    connectRequest: connectRequestId,
    from: userId,
    ...(slotIndex !== undefined && slotIndex !== null ? { slotIndex } : {}),
  });

// All feedback entries for a session (both sides), with from populated
const findAllForSession = (connectRequestId) =>
  Feedback.find({ connectRequest: connectRequestId })
    .populate("from", "name email")
    .lean();

// All feedback received by a user — used to recalculate avgRating
const findAllForRecipient = (toUserId) =>
  Feedback.find({ to: toUserId }).lean();

// Create a single feedback document
const create = (data) => Feedback.create(data);

// Fetch a single feedback with from + to populated (post-create response)
const findByIdPopulated = (id) =>
  Feedback.findById(id)
    .populate("from", "name email")
    .populate("to", "name email")
    .lean();

module.exports = {
  findDuplicate,
  findAllForSession,
  findAllForRecipient,
  create,
  findByIdPopulated,
};
