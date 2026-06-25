/**
 * @fileoverview Session Service
 * @description Domain operations for appointment slot scheduling updates, validations, and real-time synchronizations.
 */

const AppError = require("../utils/AppError");

const ALLOWED_MEETING_DOMAINS = [
  "meet.google.com",
  "zoom.us",
  "teams.microsoft.com",
  "whereby.com",
  "around.co",
  "meet.jit.si",
  "webex.com",
];
const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DEFAULT_TIMEZONE = "Asia/Kolkata";

const createSessionService = (
  mongoose,
  connectRequestRepo,
  availabilityRepo,
  escrowService,
  releaseEscrow,
  socketHandler,
  emailUtils,
  generateAvailableSlots,
  logger,
) => {
  const {
    sendSlotCancelledEmail,
    sendSlotRescheduledEmail,
    sendAdditionalSlotEmail,
  } = emailUtils;
  const { fireAndForgetEmail } = emailUtils;

  const _assertParticipant = (request, userId) => {
    const uid = userId.toString();
    if (
      request.mentor.toString() !== uid &&
      request.mentee.toString() !== uid
    ) {
      throw new AppError("Not authorized", 403);
    }
  };

  const _getValidatedSlotIndex = (request, slotIndex) => {
    const idx = Number.parseInt(slotIndex, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= request.selectedSlots.length) {
      throw new AppError("Invalid slot index", 400);
    }
    return idx;
  };

  const _isValidMeetingLink = (rawUrl) => {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "https:") return false;
      const host = url.hostname.toLowerCase();
      return ALLOWED_MEETING_DOMAINS.some(
        (d) => host === d || host.endsWith(`.${d}`),
      );
    } catch {
      return false;
    }
  };

  const _emitSlotUpdate = (request, payload) => {
    try {
      if (!socketHandler.emitToUser) return;
      socketHandler.emitToUser(
        request.mentor.toString(),
        "session_slots_updated",
        payload,
      );
      socketHandler.emitToUser(
        request.mentee.toString(),
        "session_slots_updated",
        payload,
      );
    } catch (e) {
      logger.warn("emitSlotUpdate failed", { message: e.message });
    }
  };

  const _emitToOther = (request, currentUserId, event, payload) => {
    try {
      if (!socketHandler.emitToUser) return;
      const otherId =
        request.mentor.toString() === currentUserId.toString()
          ? request.mentee.toString()
          : request.mentor.toString();
      socketHandler.emitToUser(otherId, event, payload);
    } catch (e) {
      logger.warn("emitToOther failed", { message: e.message });
    }
  };

  const _triggerAdditionalSlotEmail = (id, slot) => {
    connectRequestRepo
      .findByIdWithParticipants(id)
      .then((pop) =>
        fireAndForgetEmail(
          () =>
            sendAdditionalSlotEmail({
              connectRequestId: id,
              mentorName: pop.mentor.name,
              mentorEmail: pop.mentor.email,
              menteeName: pop.mentee.name,
              menteeEmail: pop.mentee.email,
              slot,
            }),
          "Additional Session Slot Added Notification",
        ),
      )
      .catch((err) =>
        logger.error(
          "Database resolution failed for additional slot email tracking",
          { message: err.message },
        ),
      );
  };

  const _triggerCancelEmail = (id, slot, cancelledBy, reason) => {
    connectRequestRepo
      .findByIdWithParticipants(id)
      .then((pop) =>
        fireAndForgetEmail(
          () =>
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
          "Session Slot Cancellation Notification",
        ),
      )
      .catch((err) =>
        logger.error(
          "Database resolution failed for slot cancel email tracking",
          { message: err.message },
        ),
      );
  };

  const _triggerRescheduleEmail = (id, oldSlot, newSlot) => {
    connectRequestRepo
      .findByIdWithParticipants(id)
      .then((pop) =>
        fireAndForgetEmail(
          () =>
            sendSlotRescheduledEmail({
              connectRequestId: id,
              mentorName: pop.mentor.name,
              mentorEmail: pop.mentor.email,
              menteeName: pop.mentee.name,
              menteeEmail: pop.mentee.email,
              oldSlot,
              newSlot,
            }),
          "Session Slot Rescheduled Notification",
        ),
      )
      .catch((err) =>
        logger.error(
          "Database resolution failed for reschedule email tracking",
          { message: err.message },
        ),
      );
  };

  const _validateAndApplyMark = (request, idx, userId) => {
    const slot = request.selectedSlots[idx];
    if (slot.status === "cancelled")
      throw new AppError("Cannot mark a cancelled slot as complete", 400);

    const isMentor = request.mentor.toString() === userId.toString();
    const isMentee = request.mentee.toString() === userId.toString();

    if (slot.menteeMarked && slot.mentorMarked)
      throw new AppError(
        "This session is already marked complete by both parties",
        400,
      );
    if (isMentee && slot.menteeMarked)
      throw new AppError("You have already marked this session complete", 400);
    if (isMentor && slot.mentorMarked)
      throw new AppError("You have already marked this session complete", 400);

    if (isMentee) {
      request.selectedSlots[idx].menteeMarked = true;
    } else {
      request.selectedSlots[idx].mentorMarked = true;
    }

    const bothMarked =
      request.selectedSlots[idx].menteeMarked &&
      request.selectedSlots[idx].mentorMarked;
    if (bothMarked) request.selectedSlots[idx].completedAt = new Date();

    return { isMentee, bothMarked };
  };

  const _buildCompletionResponse = (
    request,
    idx,
    isMentee,
    bothMarked,
    allComplete,
    releaseResult,
  ) => {
    const activeSlots = request.selectedSlots.filter(
      (s) => s.status !== "cancelled",
    );
    const completedCount = activeSlots.filter(
      (s) => s.menteeMarked && s.mentorMarked,
    ).length;
    const progress =
      activeSlots.length > 0
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

  const getSlots = async (connectRequestId, userId) => {
    const request = await connectRequestRepo.findByIdRaw(connectRequestId);
    if (!request) throw new AppError("Session not found", 404);
    _assertParticipant(request, userId);

    const activeSlots = request.selectedSlots.filter(
      (s) => s.status !== "cancelled",
    );
    const completedCount = activeSlots.filter(
      (s) => s.menteeMarked && s.mentorMarked,
    ).length;

    return {
      slots: request.selectedSlots,
      additionalSlots: request.additionalSlots || [],
      totalSlots: activeSlots.length,
      completedSlots: completedCount,
      progress:
        activeSlots.length > 0
          ? Math.round((completedCount / activeSlots.length) * 100)
          : 0,
    };
  };

  const setMeetingLink = async ({
    connectRequestId,
    slotIndex,
    meetingLink,
    userId,
  }) => {
    if (!meetingLink?.trim())
      throw new AppError("meetingLink is required", 400);
    if (!_isValidMeetingLink(meetingLink.trim())) {
      throw new AppError(
        "Only links from trusted platforms (Google Meet, Zoom, etc.) are allowed.",
        400,
      );
    }

    const request = await connectRequestRepo.findByIdRaw(connectRequestId);
    if (!request) throw new AppError("Session not found", 404);
    _assertParticipant(request, userId);
    if (request.status !== "ongoing")
      throw new AppError("Session is not active", 400);

    const idx = _getValidatedSlotIndex(request, slotIndex);
    request.selectedSlots[idx].meetingLink = meetingLink.trim();
    request.markModified("selectedSlots");
    await connectRequestRepo.save(request);

    const activeSlots = request.selectedSlots.filter(
      (s) => s.status !== "cancelled",
    );
    const completedCount = activeSlots.filter(
      (s) => s.menteeMarked && s.mentorMarked,
    ).length;
    const progress =
      activeSlots.length > 0
        ? Math.round((completedCount / activeSlots.length) * 100)
        : 0;

    _emitSlotUpdate(request, {
      connectRequestId,
      slots: request.selectedSlots,
      totalSlots: activeSlots.length,
      completedSlots: completedCount,
      progress,
    });

    return { slot: request.selectedSlots[idx], slotIndex: idx };
  };

  const markSlotComplete = async ({ connectRequestId, slotIndex, userId }) => {
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const request = await connectRequestRepo.findByIdRaw(
        connectRequestId,
        mongoSession,
      );
      if (!request) throw new AppError("Session not found", 404);
      _assertParticipant(request, userId);
      if (request.status !== "ongoing")
        throw new AppError("Session is not active", 400);

      const idx = _getValidatedSlotIndex(request, slotIndex);
      const { isMentee, bothMarked } = _validateAndApplyMark(
        request,
        idx,
        userId,
      );

      request.markModified("selectedSlots");
      await connectRequestRepo.save(request, mongoSession);

      const activeSlots = request.selectedSlots.filter(
        (s) => s.status !== "cancelled",
      );
      const allComplete =
        activeSlots.length > 0 &&
        activeSlots.every((s) => s.menteeMarked && s.mentorMarked);

      let releaseResult = null;
      if (allComplete)
        releaseResult = await releaseEscrow(connectRequestId, mongoSession);

      await mongoSession.commitTransaction();

      const completedCount = activeSlots.filter(
        (s) => s.menteeMarked && s.mentorMarked,
      ).length;
      const progress =
        activeSlots.length > 0
          ? Math.round((completedCount / activeSlots.length) * 100)
          : 0;

      _emitSlotUpdate(request, {
        connectRequestId,
        slots: request.selectedSlots,
        totalSlots: activeSlots.length,
        completedSlots: completedCount,
        progress,
        allComplete,
      });

      return _buildCompletionResponse(
        request,
        idx,
        isMentee,
        bothMarked,
        allComplete,
        releaseResult,
      );
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  };

  const addSlot = async ({
    connectRequestId,
    date,
    startTime,
    endTime,
    userId,
  }) => {
    if (!date || !startTime || !endTime)
      throw new AppError("date, startTime and endTime are required", 400);

    const request = await connectRequestRepo.findByIdRaw(connectRequestId);
    if (!request) throw new AppError("Session not found", 404);
    _assertParticipant(request, userId);
    if (request.status !== "ongoing")
      throw new AppError("Can only add slots to an ongoing session", 400);

    const slotTaken =
      request.selectedSlots.find(
        (s) =>
          s.date === date &&
          s.startTime === startTime &&
          s.endTime === endTime &&
          s.status !== "cancelled",
      ) ||
      request.additionalSlots?.find(
        (s) =>
          s.date === date && s.startTime === startTime && s.endTime === endTime,
      );
    if (slotTaken)
      throw new AppError("This slot already exists in the session", 409);

    const computedDay = DAYS_OF_WEEK[new Date(date + "T00:00:00").getDay()];

    const newAdditionalSlot = {
      day: computedDay,
      date,
      startTime,
      endTime,
      meetingLink: "",
      menteeMarked: false,
      mentorMarked: false,
      completedAt: null,
      paymentStatus: "pending",
    };
    const newSelectedSlot = {
      day: computedDay,
      date,
      startTime,
      endTime,
      meetingLink: "",
      menteeMarked: false,
      mentorMarked: false,
      completedAt: null,
      status: "booked",
    };

    request.additionalSlots.push(newAdditionalSlot);
    request.selectedSlots.push(newSelectedSlot);

    request.markModified("additionalSlots");
    request.markModified("selectedSlots");
    await connectRequestRepo.save(request);

    const savedSlot =
      request.additionalSlots[request.additionalSlots.length - 1];
    const activeSlots = request.selectedSlots.filter(
      (s) => s.status !== "cancelled",
    );
    const completedCount = activeSlots.filter(
      (s) => s.menteeMarked && s.mentorMarked,
    ).length;
    const progress =
      activeSlots.length > 0
        ? Math.round((completedCount / activeSlots.length) * 100)
        : 0;

    const socketPayload = {
      connectRequestId,
      slots: request.selectedSlots,
      additionalSlots: request.additionalSlots,
      totalSlots: activeSlots.length,
      completedSlots: completedCount,
      progress,
    };
    _emitSlotUpdate(request, socketPayload);
    _triggerAdditionalSlotEmail(connectRequestId, newSelectedSlot);

    return { slot: newAdditionalSlot, slotId: savedSlot._id, ...socketPayload };
  };

  const cancelSlot = async ({
    connectRequestId,
    slotIndex,
    reason,
    userId,
  }) => {
    const request = await connectRequestRepo.findByIdRaw(connectRequestId);
    if (!request) throw new AppError("Session not found", 404);
    _assertParticipant(request, userId);
    if (request.status !== "ongoing")
      throw new AppError("Session is not active", 400);

    const idx = _getValidatedSlotIndex(request, slotIndex);
    const slot = request.selectedSlots[idx];
    if (slot.status === "cancelled")
      throw new AppError("This slot is already cancelled", 400);
    if (slot.menteeMarked && slot.mentorMarked)
      throw new AppError("Cannot cancel a completed slot", 400);

    const cancelledBy =
      request.mentor.toString() === userId.toString() ? "mentor" : "mentee";

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

    const activeSlots = request.selectedSlots.filter(
      (s) => s.status !== "cancelled",
    );
    const completedCount = activeSlots.filter(
      (s) => s.menteeMarked && s.mentorMarked,
    ).length;
    const progress =
      activeSlots.length > 0
        ? Math.round((completedCount / activeSlots.length) * 100)
        : 0;

    const socketPayload = {
      connectRequestId,
      slots: request.selectedSlots,
      totalSlots: activeSlots.length,
      completedSlots: completedCount,
      progress,
    };
    _emitSlotUpdate(request, socketPayload);

    _emitToOther(request, userId, "slot_cancelled", {
      connectRequestId,
      slotIndex: idx,
      slot: request.selectedSlots[idx],
      cancelledBy,
      reason,
      refund: refundResult ? { amount: refundResult.refundedAmount } : null,
    });
    _triggerCancelEmail(
      connectRequestId,
      request.selectedSlots[idx],
      cancelledBy,
      reason,
    );

    return {
      slot: request.selectedSlots[idx],
      slotIndex: idx,
      refund: refundResult
        ? {
            refundedAmount: refundResult.refundedAmount,
            newBalance: refundResult.balance,
            newEscrow: refundResult.escrow,
          }
        : null,
      ...socketPayload,
    };
  };

  const rescheduleSlot = async ({
    connectRequestId,
    slotIndex,
    date,
    startTime,
    endTime,
    userId,
  }) => {
    if (!date || !startTime || !endTime)
      throw new AppError(
        "date, startTime, and endTime are required for the new slot",
        400,
      );

    const request = await connectRequestRepo.findByIdRaw(connectRequestId);
    if (!request) throw new AppError("Session not found", 404);
    _assertParticipant(request, userId);
    if (request.mentee.toString() !== userId.toString())
      throw new AppError("Only the mentee can reschedule slots", 403);
    if (request.status !== "ongoing")
      throw new AppError("Session is not active", 400);

    const idx = _getValidatedSlotIndex(request, slotIndex);
    const oldSlot = request.selectedSlots[idx];
    if (oldSlot.status === "cancelled")
      throw new AppError("This slot is already cancelled", 400);
    if (oldSlot.menteeMarked && oldSlot.mentorMarked)
      throw new AppError("Cannot reschedule a completed slot", 400);

    const newSlotTaken = request.selectedSlots.find(
      (s) =>
        s.date === date &&
        s.startTime === startTime &&
        s.endTime === endTime &&
        s.status !== "cancelled",
    );
    if (newSlotTaken) throw new AppError("The new slot is already booked", 409);

    const computedDay = DAYS_OF_WEEK[new Date(date + "T00:00:00").getDay()];

    request.selectedSlots[idx].status = "cancelled";
    request.selectedSlots[idx].cancelledBy = "mentee";
    request.selectedSlots[idx].cancelledAt = new Date();
    request.selectedSlots[idx].cancellationReason = "rescheduled";
    request.selectedSlots[idx].isRescheduled = true;

    const newSlot = {
      day: computedDay,
      date,
      startTime,
      endTime,
      meetingLink: "",
      menteeMarked: false,
      mentorMarked: false,
      completedAt: null,
      status: "booked",
      isRescheduled: true,
      rescheduledFromIndex: idx,
    };
    request.selectedSlots.push(newSlot);

    request.markModified("selectedSlots");
    await connectRequestRepo.save(request);

    const newSlotIndex = request.selectedSlots.length - 1;
    const activeSlots = request.selectedSlots.filter(
      (s) => s.status !== "cancelled",
    );
    const completedCount = activeSlots.filter(
      (s) => s.menteeMarked && s.mentorMarked,
    ).length;
    const progress =
      activeSlots.length > 0
        ? Math.round((completedCount / activeSlots.length) * 100)
        : 0;

    const socketPayload = {
      connectRequestId,
      slots: request.selectedSlots,
      totalSlots: activeSlots.length,
      completedSlots: completedCount,
      progress,
    };
    _emitSlotUpdate(request, socketPayload);

    _emitToOther(request, userId, "slot_rescheduled", {
      connectRequestId,
      oldSlotIndex: idx,
      newSlotIndex,
      oldSlot: request.selectedSlots[idx],
      newSlot: request.selectedSlots[newSlotIndex],
    });
    _triggerRescheduleEmail(
      connectRequestId,
      request.selectedSlots[idx],
      request.selectedSlots[newSlotIndex],
    );

    return {
      oldSlot: request.selectedSlots[idx],
      newSlot: request.selectedSlots[newSlotIndex],
      oldSlotIndex: idx,
      newSlotIndex,
      ...socketPayload,
    };
  };

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
    ].map((s) => ({
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

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

  return {
    getSlots,
    setMeetingLink,
    markSlotComplete,
    addSlot,
    cancelSlot,
    rescheduleSlot,
    getMentorAvailability,
  };
};

module.exports = createSessionService;
