/**
 * @fileoverview Session Service
 * @description Domain operations for appointment slot scheduling updates, validations, and real-time synchronizations.
 */
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

// Repositories
const connectRequestRepo = require("../repositories/connectRequest.repository");
const availabilityRepo = require("../repositories/availability.repository");

// Inter-domain Dependency
const escrowService = require("./escrow.service");
const logger = require("../config/logger");
// Utilities
const releaseEscrow = require("../utils/releaseEscrow");
const { sendSlotCancelledEmail, sendSlotRescheduledEmail, sendAdditionalSlotEmail } = require("../utils/sendNotificationEmail");
const { generateAvailableSlots } = require("../utils/generateSlots");


// Domain Constants
const ALLOWED_MEETING_DOMAINS = [
  "meet.google.com", "zoom.us", "teams.microsoft.com", "whereby.com", "around.co", "meet.jit.si", "webex.com"
];
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Fetches structured parameters tracking all nested slot items related to a targeted connection request.
 * @param {string} connectRequestId Connection workflow tracking key.
 * @param {string} userId Evaluated identity parsing context.
 * @throws {AppError} 403 | 404
 * @returns {Promise<Object>} Calculated completion tracking statistics maps.
 */
const getSlots = async (connectRequestId, userId) => {
  const request = await connectRequestRepo.findByIdRaw(connectRequestId);
  if (!request) throw new AppError("Session not found", 404);
  _assertParticipant(request, userId);

  const activeSlots = request.selectedSlots.filter((s) => s.status !== "cancelled");
  const completedCount = activeSlots.filter((s) => s.menteeMarked && s.mentorMarked).length;

  return {
    slots: request.selectedSlots,
    additionalSlots: request.additionalSlots || [],
    totalSlots: activeSlots.length,
    completedSlots: completedCount,
    progress: activeSlots.length > 0 ? Math.round((completedCount / activeSlots.length) * 100) : 0,
  };
};

/**
 * Assigns or shifts secure remote workspace reference URLs allocated down across designated scheduling blocks.
 * @param {Object} params Configuration context.
 * @param {string} params.connectRequestId Connection resource location.
 * @param {string} params.slotIndex Structural position marker map.
 * @param {string} params.meetingLink Formatted secure destination endpoint string.
 * @param {string} params.userId Acting credential validation pointer.
 * @throws {AppError} 400 | 403 | 404
 * @returns {Promise<Object>} Updated structural status objects.
 */
const setMeetingLink = async ({ connectRequestId, slotIndex, meetingLink, userId }) => {
  if (!meetingLink?.trim()) throw new AppError("meetingLink is required", 400);
  if (!_isValidMeetingLink(meetingLink.trim())) {
    throw new AppError("Only links from trusted platforms (Google Meet, Zoom, etc.) are allowed.", 400);
  }

  const request = await connectRequestRepo.findByIdRaw(connectRequestId);
  if (!request) throw new AppError("Session not found", 404);
  _assertParticipant(request, userId);
  if (request.status !== "ongoing") throw new AppError("Session is not active", 400);

  const idx = _getValidatedSlotIndex(request, slotIndex);
  request.selectedSlots[idx].meetingLink = meetingLink.trim();
  request.markModified("selectedSlots");
  await connectRequestRepo.save(request);

  const activeSlots = request.selectedSlots.filter((s) => s.status !== "cancelled");
  const completedCount = activeSlots.filter((s) => s.menteeMarked && s.mentorMarked).length;
  const progress = activeSlots.length > 0 ? Math.round((completedCount / activeSlots.length) * 100) : 0;

  const socketPayload = { connectRequestId, slots: request.selectedSlots, totalSlots: activeSlots.length, completedSlots: completedCount, progress };
  _emitSlotUpdate(request, socketPayload);

  return { slot: request.selectedSlots[idx], slotIndex: idx };
};

/**
 * Validates slot state and applies the caller's completion mark.
 * Throws AppError on any guard-clause violation.
 * @private
 * @param {Object} request  - The connect-request document.
 * @param {number} idx      - Validated slot index.
 * @param {string} userId   - Calling user's ID.
 * @returns {{ isMentee: boolean, bothMarked: boolean }} Mark outcome flags.
 */
const _validateAndApplyMark = (request, idx, userId) => {
  const slot = request.selectedSlots[idx];
  if (slot.status === "cancelled")
    throw new AppError("Cannot mark a cancelled slot as complete", 400);

  const isMentor = request.mentor.toString() === userId.toString();
  const isMentee = request.mentee.toString() === userId.toString();

  if (slot.menteeMarked && slot.mentorMarked)
    throw new AppError("This session is already marked complete by both parties", 400);
  if (isMentee && slot.menteeMarked)
    throw new AppError("You have already marked this session complete", 400);
  if (isMentor && slot.mentorMarked)
    throw new AppError("You have already marked this session complete", 400);

  if (isMentee) {
    request.selectedSlots[idx].menteeMarked = true;
  } else {
    request.selectedSlots[idx].mentorMarked = true;
  }

  const bothMarked = request.selectedSlots[idx].menteeMarked && request.selectedSlots[idx].mentorMarked;
  if (bothMarked) request.selectedSlots[idx].completedAt = new Date();

  return { isMentee, bothMarked };
};

/**
 * Computes progress stats and assembles the response object after a slot is marked.
 * @private
 * @param {Object} request         - The connect-request document.
 * @param {number} idx             - Validated slot index.
 * @param {boolean} isMentee       - Whether the caller is the mentee.
 * @param {boolean} bothMarked     - Whether both parties have now marked the slot.
 * @param {boolean} allComplete    - Whether every active slot is fully complete.
 * @param {Object|null} releaseResult - Escrow release outcome, if any.
 * @returns {Object} The public response payload.
 */
const _buildCompletionResponse = (request, idx, isMentee, bothMarked, allComplete, releaseResult) => {
  const activeSlots = request.selectedSlots.filter((s) => s.status !== "cancelled");
  const completedCount = activeSlots.filter((s) => s.menteeMarked && s.mentorMarked).length;
  const progress = activeSlots.length > 0
    ? Math.round((completedCount / activeSlots.length) * 100)
    : 0;

  const waitingFor = isMentee ? "mentor" : "mentee";
  let message;
  if (allComplete) {
    message = "All sessions complete! Tokens released to mentor.";
  } else if (bothMarked) {
    message = "Session marked complete by both parties.";
  } else {
    message = `Session marked complete. Waiting for ${waitingFor} to confirm.`;
  }

  return {
    success: true,
    message,
    slot: request.selectedSlots[idx],
    slotIndex: idx,
    bothMarked,
    allComplete,
    completedSlots: completedCount,
    totalSlots: activeSlots.length,
    progress,
    escrowRelease: releaseResult,
  };
};

/**
 * Records individual validation markings verifying localized performance completions across scheduled timelines.
 * Cognitive Complexity: ≤ 15 (refactored from 23).
 * @param {Object} params Structural tracking criteria parameters.
 * @param {string} params.connectRequestId Database reference workflow key.
 * @param {string} params.slotIndex Positional target coordinate pointer.
 * @param {string} params.userId Executing signature reference identifier tracking.
 * @throws {AppError} 400 | 403 | 404
 * @returns {Promise<Object>} State response properties tracking actions.
 */
const markSlotComplete = async ({ connectRequestId, slotIndex, userId }) => {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const request = await connectRequestRepo.findByIdRaw(connectRequestId, mongoSession);
    if (!request) throw new AppError("Session not found", 404);
    _assertParticipant(request, userId);
    if (request.status !== "ongoing") throw new AppError("Session is not active", 400);

    const idx = _getValidatedSlotIndex(request, slotIndex);
    const { isMentee, bothMarked } = _validateAndApplyMark(request, idx, userId);

    request.markModified("selectedSlots");
    await connectRequestRepo.save(request, mongoSession);

    const activeSlots = request.selectedSlots.filter((s) => s.status !== "cancelled");
    const allComplete = activeSlots.length > 0 && activeSlots.every((s) => s.menteeMarked && s.mentorMarked);

    let releaseResult = null;
    if (allComplete) releaseResult = await releaseEscrow(connectRequestId, mongoSession);

    await mongoSession.commitTransaction();

    const completedCount = activeSlots.filter((s) => s.menteeMarked && s.mentorMarked).length;
    const progress = activeSlots.length > 0 ? Math.round((completedCount / activeSlots.length) * 100) : 0;

    _emitSlotUpdate(request, {
      connectRequestId,
      slots: request.selectedSlots,
      totalSlots: activeSlots.length,
      completedSlots: completedCount,
      progress,
      allComplete,
    });

    return _buildCompletionResponse(request, idx, isMentee, bothMarked, allComplete, releaseResult);
  } catch (err) {
    await mongoSession.abortTransaction();
    throw err;
  } finally {
    mongoSession.endSession();
  }
};

/**
 * Dynamically updates appointment matrix chains appending distinct slot blocks onto active agreements.
 * @param {Object} params Scheduling metadata inputs mapping requirements.
 * @param {string} params.connectRequestId Target lifecycle transaction index.
 * @param {string} params.date ISO Date configuration format.
 * @param {string} params.startTime Start window hour timestamp marker.
 * @param {string} params.endTime Termination window scale parameter.
 * @param {string} params.userId Creator tracking profiles credentials context.
 * @throws {AppError} 400 | 403 | 404 | 409
 * @returns {Promise<Object>} Added entity tracking identities arrays.
 */
const addSlot = async ({ connectRequestId, date, startTime, endTime, userId }) => {
  if (!date || !startTime || !endTime) throw new AppError("date, startTime and endTime are required", 400);

  const request = await connectRequestRepo.findByIdRaw(connectRequestId);
  if (!request) throw new AppError("Session not found", 404);
  _assertParticipant(request, userId);
  if (request.status !== "ongoing") throw new AppError("Can only add slots to an ongoing session", 400);

  const slotTaken = request.selectedSlots.find((s) => s.date === date && s.startTime === startTime && s.endTime === endTime && s.status !== "cancelled") ||
                    request.additionalSlots?.find((s) => s.date === date && s.startTime === startTime && s.endTime === endTime);
  if (slotTaken) throw new AppError("This slot already exists in the session", 409);

  const computedDay = DAYS_OF_WEEK[new Date(date + "T00:00:00").getDay()];

  const newAdditionalSlot = { day: computedDay, date, startTime, endTime, meetingLink: "", menteeMarked: false, mentorMarked: false, completedAt: null, paymentStatus: "pending" };
  const newSelectedSlot = { day: computedDay, date, startTime, endTime, meetingLink: "", menteeMarked: false, mentorMarked: false, completedAt: null, status: "booked" };

  request.additionalSlots.push(newAdditionalSlot);
  request.selectedSlots.push(newSelectedSlot);
  
  request.markModified("additionalSlots");
  request.markModified("selectedSlots");
  await connectRequestRepo.save(request);

  const savedSlot = request.additionalSlots[request.additionalSlots.length - 1];
  const activeSlots = request.selectedSlots.filter((s) => s.status !== "cancelled");
  const completedCount = activeSlots.filter((s) => s.menteeMarked && s.mentorMarked).length;
  const progress = activeSlots.length > 0 ? Math.round((completedCount / activeSlots.length) * 100) : 0;

  const socketPayload = { connectRequestId, slots: request.selectedSlots, additionalSlots: request.additionalSlots, totalSlots: activeSlots.length, completedSlots: completedCount, progress };
  _emitSlotUpdate(request, socketPayload);

  _triggerAdditionalSlotEmail(connectRequestId, newSelectedSlot);

  return { slot: newAdditionalSlot, slotId: savedSlot._id, ...socketPayload };
};

/**
 * Implements cancellation logic directly across targeting slot indexes, adjusting escrow dependencies safely.
 * @param {Object} params Configuration criteria tracking profiles.
 * @param {string} params.connectRequestId Connection resource pointer index.
 * @param {string} params.slotIndex Structural nested index parameter location tracking.
 * @param {string} params.reason Documented baseline description explaining changes.
 * @param {string} params.userId Actor track trace.
 * @throws {AppError} 400 | 403 | 404
 * @returns {Promise<Object>} Execution status responses including structural updates.
 */
const cancelSlot = async ({ connectRequestId, slotIndex, reason, userId }) => {
  const request = await connectRequestRepo.findByIdRaw(connectRequestId);
  if (!request) throw new AppError("Session not found", 404);
  _assertParticipant(request, userId);
  if (request.status !== "ongoing") throw new AppError("Session is not active", 400);

  const idx = _getValidatedSlotIndex(request, slotIndex);
  const slot = request.selectedSlots[idx];
  if (slot.status === "cancelled") throw new AppError("This slot is already cancelled", 400);
  if (slot.menteeMarked && slot.mentorMarked) throw new AppError("Cannot cancel a completed slot", 400);

  const cancelledBy = request.mentor.toString() === userId.toString() ? "mentor" : "mentee";

  request.selectedSlots[idx].status = "cancelled";
  request.selectedSlots[idx].cancelledBy = cancelledBy;
  request.selectedSlots[idx].cancelledAt = new Date();
  request.selectedSlots[idx].cancellationReason = (reason || "").trim();

  request.markModified("selectedSlots");
  await connectRequestRepo.save(request);

  let refundResult = null;
  if (request.paymentStatus === "paid") {
    try {
      refundResult = await escrowService.refundSlot({
        connectRequestId,
        slotIndex: idx,
        cancelledBy,
      });
    } catch (err) {
      logger.error("Slot refund failed — slot remains cancelled", {
        message: err.message,
      });
    }
  }

  const activeSlots = request.selectedSlots.filter((s) => s.status !== "cancelled");
  const completedCount = activeSlots.filter((s) => s.menteeMarked && s.mentorMarked).length;
  const progress = activeSlots.length > 0 ? Math.round((completedCount / activeSlots.length) * 100) : 0;

  const socketPayload = { connectRequestId, slots: request.selectedSlots, totalSlots: activeSlots.length, completedSlots: completedCount, progress };
  _emitSlotUpdate(request, socketPayload);

  _emitToOther(request, userId, "slot_cancelled", { connectRequestId, slotIndex: idx, slot: request.selectedSlots[idx], cancelledBy, reason, refund: refundResult ? { amount: refundResult.refundedAmount } : null });
  _triggerCancelEmail(connectRequestId, request.selectedSlots[idx], cancelledBy, reason);

  return { slot: request.selectedSlots[idx], slotIndex: idx, refund: refundResult ? { refundedAmount: refundResult.refundedAmount, newBalance: refundResult.balance, newEscrow: refundResult.escrow } : null, ...socketPayload };
};

/**
 * Shifts appointments onto alternative date setups without impacting global baseline escrow allocations.
 * @param {Object} params Parameter tracking configurations mapping maps.
 * @param {string} params.connectRequestId Connection resource location target context tracker.
 * @param {string} params.slotIndex Current matrix position target vector parameter location index.
 * @param {string} params.date Reconfigured date selection item.
 * @param {string} params.startTime Alternative initialization timestamp markers parameter tracking bounds.
 * @param {string} params.endTime Desired termination window bounds configuration metrics framework.
 * @param {string} params.userId Actor entity passport validations pointer parameter maps track.
 * @throws {AppError} 400 | 403 | 404 | 409
 * @returns {Promise<Object>} Complete altered resource descriptions tracking summaries.
 */
const rescheduleSlot = async ({ connectRequestId, slotIndex, date, startTime, endTime, userId }) => {
  if (!date || !startTime || !endTime) throw new AppError("date, startTime, and endTime are required for the new slot", 400);

  const request = await connectRequestRepo.findByIdRaw(connectRequestId);
  if (!request) throw new AppError("Session not found", 404);
  _assertParticipant(request, userId);
  if (request.mentee.toString() !== userId.toString()) throw new AppError("Only the mentee can reschedule slots", 403);
  if (request.status !== "ongoing") throw new AppError("Session is not active", 400);

  const idx = _getValidatedSlotIndex(request, slotIndex);
  const oldSlot = request.selectedSlots[idx];
  if (oldSlot.status === "cancelled") throw new AppError("This slot is already cancelled", 400);
  if (oldSlot.menteeMarked && oldSlot.mentorMarked) throw new AppError("Cannot reschedule a completed slot", 400);

  const newSlotTaken = request.selectedSlots.find((s) => s.date === date && s.startTime === startTime && s.endTime === endTime && s.status !== "cancelled");
  if (newSlotTaken) throw new AppError("The new slot is already booked", 409);

  const computedDay = DAYS_OF_WEEK[new Date(date + "T00:00:00").getDay()];

  request.selectedSlots[idx].status = "cancelled";
  request.selectedSlots[idx].cancelledBy = "mentee";
  request.selectedSlots[idx].cancelledAt = new Date();
  request.selectedSlots[idx].cancellationReason = "rescheduled";
  request.selectedSlots[idx].isRescheduled = true;

  const newSlot = { day: computedDay, date, startTime, endTime, meetingLink: "", menteeMarked: false, mentorMarked: false, completedAt: null, status: "booked", isRescheduled: true, rescheduledFromIndex: idx };
  request.selectedSlots.push(newSlot);
  
  request.markModified("selectedSlots");
  await connectRequestRepo.save(request);

  const newSlotIndex = request.selectedSlots.length - 1;
  const activeSlots = request.selectedSlots.filter((s) => s.status !== "cancelled");
  const completedCount = activeSlots.filter((s) => s.menteeMarked && s.mentorMarked).length;
  const progress = activeSlots.length > 0 ? Math.round((completedCount / activeSlots.length) * 100) : 0;

  const socketPayload = { connectRequestId, slots: request.selectedSlots, totalSlots: activeSlots.length, completedSlots: completedCount, progress };
  _emitSlotUpdate(request, socketPayload);

  _emitToOther(request, userId, "slot_rescheduled", { connectRequestId, oldSlotIndex: idx, newSlotIndex, oldSlot: request.selectedSlots[idx], newSlot: request.selectedSlots[newSlotIndex] });
  _triggerRescheduleEmail(connectRequestId, request.selectedSlots[idx], request.selectedSlots[newSlotIndex]);

  return { oldSlot: request.selectedSlots[idx], newSlot: request.selectedSlots[newSlotIndex], oldSlotIndex: idx, newSlotIndex, ...socketPayload };
};

/**
 * Returns complete availability matrices mapping available mentor slots against confirmed reservations.
 * @param {string} connectRequestId Connection workflow reference tracker.
 * @param {number} duration Numerical parameter sizing operational slot metrics scales.
 * @param {string} userId Execution identity check tracks.
 * @throws {AppError} 403 | 404
 * @returns {Promise<Object>} Organized scheduling metrics configuration blocks.
 */
const getMentorAvailability = async (connectRequestId, duration, userId) => {
  const request = await connectRequestRepo.findByIdRaw(connectRequestId);
  if (!request) throw new AppError("Session not found", 404);
  _assertParticipant(request, userId);

  const availability = await availabilityRepo.findAvailabilityByMentor(
    request.mentor,
  );
  if (!availability) {
    return {
      slots: [],
      timezone: DEFAULT_TIMEZONE,
      sessionDurations: [30, 60],
    };
  }

  const bookedSlots = [
    ...(request.selectedSlots || []).filter((s) => s.status !== "cancelled"),
    ...(request.additionalSlots || []),
  ].map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime }));

  const grouped = generateAvailableSlots(
    duration,
    availability.specificDates || [],
    availability.weeklyHours || [],
    bookedSlots,
    28,
  );

  return {
    slots: grouped,
    timezone: availability.timezone || DEFAULT_TIMEZONE,
    sessionDurations: availability.sessionDurations || [30, 60],
  };
};

/**
 * Internal Guard Clause validating explicit user participation across targets.
 * @private
 */
const _assertParticipant = (request, userId) => {
  const uid = userId.toString();
  if (request.mentor.toString() !== uid && request.mentee.toString() !== uid) {
    throw new AppError("Not authorized", 403);
  }
};

/**
 * Internal Guard Clause verifying index allocations across explicit bounds.
 * @private
 */
const _getValidatedSlotIndex = (request, slotIndex) => {
  const idx = Number.parseInt(slotIndex, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= request.selectedSlots.length) {
    throw new AppError("Invalid slot index", 400);
  }
  return idx;
};

/**
 * Internal URL format string framework validator helper checks.
 * @private
 */
const _isValidMeetingLink = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_MEETING_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

/**
 * Web Socket messaging proxy forwarding state maps downstream in real-time.
 * @private
 */
const _emitSlotUpdate = (request, payload) => {
  try {
    const { emitToUser } = require("../socket/socketHandler");
    if (!emitToUser) return;
    emitToUser(request.mentor.toString(), "session_slots_updated", payload);
    emitToUser(request.mentee.toString(), "session_slots_updated", payload);
  } catch (e) {
    logger.warn("emitSlotUpdate failed", { message: e.message });
  }
};

/**
 * Targeted Web Socket pipeline delivering metrics strictly across alternate channels.
 * @private
 */
const _emitToOther = (request, currentUserId, event, payload) => {
  try {
    const { emitToUser } = require("../socket/socketHandler");
    if (!emitToUser) return;
    const otherId =
      request.mentor.toString() === currentUserId.toString()
        ? request.mentee.toString()
        : request.mentor.toString();
    emitToUser(otherId, event, payload);
  } catch (e) {
    logger.warn("emitToOther failed", { message: e.message });
  }
};

/** Emails Side-effects Triggers */
const _triggerAdditionalSlotEmail = (id, slot) => {
  connectRequestRepo
    .findByIdWithParticipants(id)
    .then((pop) =>
      sendAdditionalSlotEmail({
        connectRequestId: id,
        mentorName: pop.mentor.name,
        mentorEmail: pop.mentor.email,
        menteeName: pop.mentee.name,
        menteeEmail: pop.mentee.email,
        slot,
      }),
    )
    .catch((err) =>
      logger.error("Additional slot email failed", { message: err.message }),
    );
};

const _triggerCancelEmail = (id, slot, cancelledBy, reason) => {
  connectRequestRepo
    .findByIdWithParticipants(id)
    .then((pop) =>
      sendSlotCancelledEmail({
        connectRequestId: id,
        mentorName: pop.mentor.name,
        mentorEmail: pop.mentor.email,
        menteeName: pop.mentee.name,
        menteeEmail: pop.mentee.email,
        slot,
        cancelledBy,
        reason,
      }),
    )
    .catch((err) =>
      logger.error("Slot cancel email failed", { message: err.message }),
    );
};

const _triggerRescheduleEmail = (id, oldSlot, newSlot) => {
  connectRequestRepo
    .findByIdWithParticipants(id)
    .then((pop) =>
      sendSlotRescheduledEmail({
        connectRequestId: id,
        mentorName: pop.mentor.name,
        mentorEmail: pop.mentor.email,
        menteeName: pop.mentee.name,
        menteeEmail: pop.mentee.email,
        oldSlot,
        newSlot,
      }),
    )
    .catch((err) =>
      logger.error("Reschedule email failed", { message: err.message }),
    );
};

module.exports = {
  getSlots,
  setMeetingLink,
  markSlotComplete,
  addSlot,
  cancelSlot,
  rescheduleSlot,
  getMentorAvailability,
};