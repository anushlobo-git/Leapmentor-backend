const mongoose = require("mongoose");
const connectRequestRepository = require("../repositories/connectRequest.repository");
const mentorRepository = require("../repositories/mentor.repository");
const menteeRepository = require("../repositories/mentee.repository");
const createNotification = require("../utils/createNotification");
const {
  sendConnectRequestEmail,
  sendRequestAcceptedEmail,
} = require("../utils/sendNotificationEmail");

const getEmitToUser = () => require("../socket/socketHandler").emitToUser;



// ── SEND REQUEST ──────────────────────────────────────────────
const sendConnectRequestService = async (menteeId, body, menteeUser) => {
  const { mentorId, message, selectedSlots, sessionRate, sessionCount } = body;

  if (!mentorId)
    throw Object.assign(new Error("mentorId is required"), { statusCode: 400 });
  if (!Array.isArray(selectedSlots) || !selectedSlots.length)
    throw Object.assign(new Error("At least one slot must be selected"), {
      statusCode: 400,
    });
  if (selectedSlots.length > 5)
    throw Object.assign(new Error("Maximum 5 slots can be proposed"), {
      statusCode: 400,
    });

  for (const slot of selectedSlots) {
    if (!slot.day || !slot.date || !slot.startTime || !slot.endTime)
      throw Object.assign(
        new Error("Each slot must have day, date, startTime and endTime"),
        { statusCode: 400 },
      );
  }

  if (menteeId.toString() === mentorId)
    throw Object.assign(new Error("You cannot send a request to yourself"), {
      statusCode: 400,
    });

  const existingPending = await connectRequestRepository.findPendingRequest(
    menteeId,
    mentorId,
  );
  if (existingPending)
    throw Object.assign(
      new Error("You already have a pending request with this mentor"),
      { statusCode: 409 },
    );

  for (const slot of selectedSlots) {
    const slotTaken = await connectRequestRepository.findSlotConflict(
      mentorId,
      slot,
    );
    if (slotTaken)
      throw Object.assign(
        new Error(
          `Slot ${slot.date} ${slot.startTime}–${slot.endTime} is already taken. Please choose another.`,
        ),
        { statusCode: 409 },
      );
  }

  if (sessionRate && Number(sessionRate) < 1)
    throw Object.assign(new Error("sessionRate must be at least 1"), {
      statusCode: 400,
    });
  if (sessionCount && Number(sessionCount) < 1)
    throw Object.assign(new Error("sessionCount must be at least 1"), {
      statusCode: 400,
    });

  const request = await connectRequestRepository.createConnectRequest({
    mentee: menteeId,
    mentor: mentorId,
    message: message?.trim() || "",
    selectedSlots,
    requestedAt: new Date(),
    sessionRate: sessionRate ? Number(sessionRate) : null,
    sessionCount: sessionCount ? Number(sessionCount) : null,
    totalAmount:
      sessionRate && sessionCount
        ? Number(sessionRate) * Number(sessionCount)
        : null,
  });

  const populated = await connectRequestRepository.findRequestByIdWithMentor(
    request._id,
  );

  const mentorUserId = new mongoose.Types.ObjectId(mentorId);
  await createNotification({
    recipient: mentorUserId,
    type: "connect_request_received",
    title: "New Connect Request",
    message: "You have a new connect request from a mentee.",
    metadata: { requestId: request._id, menteeId },
  });

  const emitToUser = getEmitToUser();
  if (emitToUser) {
    emitToUser(mentorId, "new_connect_request", {
      title: "New Connect Request 🔔",
      message: `${menteeUser.name} sent you a connect request.`,
      type: "info",
    });
    emitToUser(mentorId, "request_status_changed", {
      requestId: request._id.toString(),
      status: "pending",
    });
  }

  sendConnectRequestEmail({
  mentorName: populated.mentor?.name || "Mentor",
  mentorEmail: populated.mentor?.email,
  menteeName: menteeUser.name,
  slots: selectedSlots,
  message: message?.trim() || "",
}).catch((err) =>
  console.error("❌ Connect request email failed:", err.message),
);

return populated;
};

// ── MY REQUESTS ───────────────────────────────────────────────
const getMyRequestsService = async (menteeId) => {
  const requests = await connectRequestRepository.findMyRequests(menteeId);

  return Promise.all(
    requests.map(async (r) => {
      const [mentorProfile, referredToProfile] = await Promise.all([
        mentorRepository.findMentorProfile(r.mentor?._id),
        r.referredTo
          ? mentorRepository.findMentorProfileFull(r.referredTo?._id)
          : null,
      ]);
      return {
        ...r,
        mentorProfile: mentorProfile || null,
        referredToProfile: referredToProfile || null,
      };
    }),
  );
};

// ── INCOMING REQUESTS ─────────────────────────────────────────
const getIncomingRequestsService = async (mentorId, status) => {
  const requests = await connectRequestRepository.findIncomingRequests(mentorId, status);

  return Promise.all(
    requests.map(async (r) => {
      const referredByProfile = r.referredBy
        ? await mentorRepository.findMentorProfileFull(r.referredBy._id)
        : null;
      return { ...r, referredByProfile: referredByProfile || null };
    }),
  );
};

// ── RESPOND TO REQUEST ────────────────────────────────────────
const respondToRequestService = async (requestId, mentorUserId, body) => {
  const { status, confirmedSlot } = body;

  if (!["accepted", "rejected"].includes(status))
    throw Object.assign(new Error("Status must be 'accepted' or 'rejected'"), {
      statusCode: 400,
    });

  if (
    status === "accepted" &&
    (!confirmedSlot?.date ||
      !confirmedSlot?.startTime ||
      !confirmedSlot?.endTime)
  )
    throw Object.assign(new Error("confirmedSlot is required when accepting"), {
      statusCode: 400,
    });

  const request =
    await connectRequestRepository.findRequestByIdWithUsers(requestId);
  if (!request)
    throw Object.assign(new Error("Request not found"), { statusCode: 404 });

  if (request.mentor._id.toString() !== mentorUserId.toString())
    throw Object.assign(
      new Error("Not authorized to respond to this request"),
      { statusCode: 403 },
    );

  if (request.status !== "pending")
    throw Object.assign(new Error(`Request already ${request.status}`), {
      statusCode: 400,
    });

  request.status = status;
  request.respondedAt = new Date();
  if (status === "accepted") request.confirmedSlot = confirmedSlot;
  await connectRequestRepository.saveRequest(request);

  const emitToUser = getEmitToUser();
  if (emitToUser) {
    emitToUser(request.mentee._id.toString(), "request_status_changed", {
      requestId: request._id.toString(),
      status,
    });
    emitToUser(request.mentor._id.toString(), "request_status_changed", {
      requestId: request._id.toString(),
      status,
    });
  }

  if (status === "accepted") {
    await createNotification({
      recipient: request.mentee._id,
      type: "connect_request_accepted",
      title: "Connect Request Accepted! 🎉",
      message: `${request.mentor.name} has accepted your connect request. Your session is confirmed on ${confirmedSlot.date} at ${confirmedSlot.startTime}.`,
      metadata: { requestId: request._id, mentorId: request.mentor._id },
    });

    if (emitToUser) {
      emitToUser(request.mentee._id.toString(), "request_accepted", {
        title: "Request Accepted! 🎉",
        message: `${request.mentor.name} accepted your connect request.`,
        type: "success",
      });
    }

    await connectRequestRepository.rejectConflictingSlots(
      request._id,
      request.mentor._id,
      confirmedSlot,
    );

    sendRequestAcceptedEmail({
      menteeName: request.mentee.name,
      menteeEmail: request.mentee.email,
      mentorName: request.mentor.name,
      confirmedSlot,
      slots: request.selectedSlots,
    }).catch((err) =>
      console.error("❌ Request accepted email failed:", err.message),
    );
  }

  if (status === "rejected") {
    await createNotification({
      recipient: request.mentee._id,
      type: "connect_request_declined",
      title: "Connect Request Declined",
      message: `${request.mentor.name} was unable to accept your connect request at this time.`,
      metadata: { requestId: request._id, mentorId: request.mentor._id },
    });

    if (emitToUser) {
      emitToUser(request.mentee._id.toString(), "request_declined", {
        title: "Request Declined",
        message: `${request.mentor.name} was unable to accept your request at this time.`,
        type: "warning",
      });
    }
  }

  return request;
};

// ── CANCEL REQUEST ────────────────────────────────────────────
const cancelRequestService = async (requestId, menteeUserId) => {
  const request = await connectRequestRepository.findRequestById(requestId);
  if (!request)
    throw Object.assign(new Error("Request not found"), { statusCode: 404 });

  if (request.mentee.toString() !== menteeUserId.toString())
    throw Object.assign(new Error("Not authorized to cancel this request"), {
      statusCode: 403,
    });

  if (request.status === "ongoing")
    throw Object.assign(new Error("Cannot delete an ongoing session"), {
      statusCode: 400,
    });

  await connectRequestRepository.deleteRequestById(requestId);
};

// ── REFER REQUEST ─────────────────────────────────────────────
const referRequestService = async (requestId, mentorUserId, body) => {
  const { referToMentorId } = body;

  if (!referToMentorId)
    throw Object.assign(new Error("referToMentorId is required"), {
      statusCode: 400,
    });

  const request =
    await connectRequestRepository.findRequestByIdWithUsers(requestId);
  if (!request)
    throw Object.assign(new Error("Request not found"), { statusCode: 404 });

  if (request.mentor._id.toString() !== mentorUserId.toString())
    throw Object.assign(new Error("Not authorized to refer this request"), {
      statusCode: 403,
    });

  if (request.status !== "pending")
    throw Object.assign(
      new Error(`Cannot refer a request that is already ${request.status}`),
      { statusCode: 400 },
    );

  if (referToMentorId === mentorUserId.toString())
    throw Object.assign(new Error("Cannot refer request to yourself"), {
      statusCode: 400,
    });

  const existingRequest = await connectRequestRepository.findPendingRequest(
    request.mentee._id,
    referToMentorId,
  );
  if (existingRequest)
    throw Object.assign(
      new Error("Mentee already has a pending request with this mentor"),
      { statusCode: 409 },
    );

  const newRequest = await connectRequestRepository.createConnectRequest({
    mentee: request.mentee._id,
    mentor: referToMentorId,
    message: request.message,
    selectedSlots: request.selectedSlots,
    requestedAt: new Date(),
    referredBy: mentorUserId,
  });

  await Promise.all([
    createNotification({
      recipient: new mongoose.Types.ObjectId(referToMentorId),
      type: "connect_request_received",
      title: "New Connect Request (Referred)",
      message: `You have received a referred connect request from ${request.mentee.name}.`,
      metadata: { requestId: newRequest._id, menteeId: request.mentee._id },
    }),
    createNotification({
      recipient: request.mentee._id,
      type: "connect_request_declined",
      title: "Request Referred to Another Mentor",
      message: `${request.mentor.name} has referred your request to another mentor who may be a better fit.`,
      metadata: { requestId: request._id, mentorId: request.mentor._id },
    }),
  ]);

  const emitToUser = getEmitToUser();
  if (emitToUser) {
    emitToUser(request.mentee._id.toString(), "request_referred", {
      title: "Request Referred",
      message: `${request.mentor.name} referred your request to another mentor.`,
      type: "info",
    });
    emitToUser(referToMentorId, "new_connect_request", {
      title: "New Connect Request (Referred) 🔔",
      message: `${request.mentee.name} was referred to you by ${request.mentor.name}.`,
      type: "info",
    });
    emitToUser(request.mentee._id.toString(), "request_status_changed", {
      requestId: request._id.toString(),
      status: "referred",
    });
    emitToUser(referToMentorId, "request_status_changed", {
      requestId: newRequest._id.toString(),
      status: "pending",
    });
  }

  request.status = "referred";
  request.referredTo = referToMentorId;
  request.referredRequestId = newRequest._id;
  request.respondedAt = new Date();
  await connectRequestRepository.saveRequest(request);

  return { originalRequest: request, newRequest };
};

// ── ONGOING CONNECTS ──────────────────────────────────────────
const getOngoingConnectsService = async (userId) => {
  const requests = await connectRequestRepository.findOngoingConnects(userId);

  return Promise.all(
    requests.map(async (r) => {
      const isMentee = r.mentee._id.toString() === userId.toString();
      if (isMentee) {
        const mentorProfile = await mentorRepository.findMentorProfile(
          r.mentor._id,
        );
        return { ...r, mentorProfile: mentorProfile || null };
      } else {
        const menteeProfile = await menteeRepository.findMenteeProfile(
          r.mentee._id,
        );
        return { ...r, menteeProfile: menteeProfile || null };
      }
    }),
  );
};

// ── CONNECT DETAIL ────────────────────────────────────────────
const getConnectDetailService = async (requestId, userId) => {
  const request = await connectRequestRepository.findRequestByIdLean(requestId);
  if (!request)
    throw Object.assign(new Error("Session not found"), { statusCode: 404 });

  const isMentee = request.mentee._id.toString() === userId.toString();
  const isMentor = request.mentor._id.toString() === userId.toString();

  if (!isMentee && !isMentor)
    throw Object.assign(new Error("Not authorized to view this session"), {
      statusCode: 403,
    });

  const [mentorProfile, menteeProfile] = await Promise.all([
    mentorRepository.findMentorProfile(request.mentor._id),
    menteeRepository.findMenteeProfile(request.mentee._id),
  ]);

  return {
    ...request,
    mentorProfile: mentorProfile || null,
    menteeProfile: menteeProfile || null,
    viewerRole: isMentee ? "mentee" : "mentor",
  };
};



module.exports = {
  sendConnectRequestService,
  getMyRequestsService,
  getIncomingRequestsService,
  respondToRequestService,
  cancelRequestService,
  referRequestService,
  getOngoingConnectsService,
  getConnectDetailService,
};
