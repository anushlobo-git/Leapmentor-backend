/**
 * @fileoverview Connection Request Management Service
 * @description Coordinates business workflows for sending, responding to, canceling,
 * and referring interaction requests between mentors and mentees via dependency injection.
 */

const createConnectRequestService = ({
  connectRequestRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  createNotification,
  fireAndForgetEmail,
  emailUtils,
  socketService,
  toMenteeProfileDTO,
  toMentorProfileDTO,
  toConnectRequestDTO,
  mongoose,
  logger,
}) => {
  const { sendConnectRequestEmail, sendRequestAcceptedEmail } = emailUtils;

  /**
   * Dispatch a brand-new connection and scheduling session proposition.
   */
  const sendConnectRequestService = async (menteeId, body, menteeUser) => {
    const { mentorId, message, selectedSlots, sessionRate, sessionCount } =
      body;

    if (!mentorId) {
      throw Object.assign(new Error("mentorId is required"), {
        statusCode: 400,
      });
    }
    if (!Array.isArray(selectedSlots) || !selectedSlots.length) {
      throw Object.assign(new Error("At least one slot must be selected"), {
        statusCode: 400,
      });
    }
    if (selectedSlots.length > 5) {
      throw Object.assign(new Error("Maximum 5 slots can be proposed"), {
        statusCode: 400,
      });
    }

    for (const slot of selectedSlots) {
      if (!slot.day || !slot.date || !slot.startTime || !slot.endTime) {
        throw Object.assign(
          new Error("Each slot must have day, date, startTime and endTime"),
          { statusCode: 400 },
        );
      }
    }

    if (menteeId.toString() === mentorId) {
      throw Object.assign(new Error("You cannot send a request to yourself"), {
        statusCode: 400,
      });
    }

    const existingPending = await connectRequestRepository.findPendingRequest(
      menteeId,
      mentorId,
    );
    if (existingPending) {
      throw Object.assign(
        new Error("You already have a pending request with this mentor"),
        { statusCode: 409 },
      );
    }

    for (const slot of selectedSlots) {
      const slotTaken = await connectRequestRepository.findSlotConflict(
        mentorId,
        slot,
      );
      if (slotTaken) {
        throw Object.assign(
          new Error(
            `Slot ${slot.date} ${slot.startTime}–${slot.endTime} is already taken. Please choose another.`,
          ),
          { statusCode: 409 },
        );
      }
    }

    const resolvedSessionCount = selectedSlots.length;
    let resolvedSessionRate = sessionRate != null ? Number(sessionRate) : null;

    if (resolvedSessionRate == null) {
      const mentorProfile =
        await mentorProfileRepository.findMentorProfile(mentorId);
      resolvedSessionRate = mentorProfile?.hourlyRate ?? null;
    }

    if (resolvedSessionRate == null || Number(resolvedSessionRate) < 1) {
      throw Object.assign(
        new Error(
          "sessionRate must be provided or stored on the mentor profile",
        ),
        { statusCode: 400 },
      );
    }
    if (resolvedSessionCount < 1) {
      throw Object.assign(new Error("sessionCount must be at least 1"), {
        statusCode: 400,
      });
    }

    if (logger && logger.info) {
      try {
        logger.info("sendConnectRequestService - incoming body", {
          menteeId: menteeId?.toString?.(),
          mentorId,
          sessionRate,
          sessionCount,
        });
      } catch (e) {}
    }

    const request = await connectRequestRepository.createConnectRequest({
      mentee: menteeId,
      mentor: mentorId,
      message: message?.trim() || "",
      selectedSlots,
      requestedAt: new Date(),
      sessionRate: Number(resolvedSessionRate),
      sessionCount: resolvedSessionCount,
      totalAmount: Number(resolvedSessionRate) * resolvedSessionCount,
    });
    if (logger && logger.info) {
      try {
        logger.info("sendConnectRequestService - created request", {
          requestId: request._id?.toString?.(),
          sessionRate: request.sessionRate,
          sessionCount: request.sessionCount,
          totalAmount: request.totalAmount,
        });
      } catch (e) {}
    }

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

    if (socketService?.emitToUser) {
      socketService.emitToUser(mentorId, "new_connect_request", {
        title: "New Connect Request 🔔",
        message: `${menteeUser.name} sent you a connect request.`,
        type: "info",
      });
      socketService.emitToUser(mentorId, "request_status_changed", {
        requestId: request._id.toString(),
        status: "pending",
      });
    }

    fireAndForgetEmail(
      () =>
        sendConnectRequestEmail({
          mentorName: populated.mentor?.name || "Mentor",
          mentorEmail: populated.mentor?.email,
          menteeName: menteeUser.name,
          slots: selectedSlots,
          message: message?.trim() || "",
        }),
      "New Connection Request Dispatched",
    );

    return toConnectRequestDTO(populated);
  };

  /**
   * Gather outgoing connection propositions with stitched bulk profile lookups.
   */
  const getMyRequestsService = async (menteeId) => {
    const requests = await connectRequestRepository.findMyRequests(menteeId);
    if (!requests.length) return [];

    const mentorIds = new Set();
    const referredToIds = new Set();
    requests.forEach((r) => {
      const mId = r.mentor?._id ?? r.mentor;
      if (mId) mentorIds.add(mId.toString());

      const refId = r.referredTo?._id ?? r.referredTo;
      if (refId) referredToIds.add(refId.toString());
    });

    const [mentorProfiles, referredToProfiles] = await Promise.all([
      mentorProfileRepository.findMentorProfilesByUserIds([...mentorIds]),
      mentorProfileRepository.findMentorProfilesByUserIds([...referredToIds]),
    ]);

    const mentorMap = new Map(
      mentorProfiles.map((p) => [p.user.toString(), p]),
    );
    const referredToMap = new Map(
      referredToProfiles.map((p) => [p.user.toString(), p]),
    );

    return requests.map((r) => {
      const targetMentorId = r.mentor?._id ?? r.mentor;
      const targetReferredToId = r.referredTo?._id ?? r.referredTo;

      const mentorProfile = targetMentorId
        ? mentorMap.get(targetMentorId.toString())
        : null;
      const referredToProfile = targetReferredToId
        ? referredToMap.get(targetReferredToId.toString())
        : null;

      return {
        ...toConnectRequestDTO(r),
        mentorProfile: toMentorProfileDTO(mentorProfile),
        referredToProfile: toMentorProfileDTO(referredToProfile),
      };
    });
  };

  /**
   * Pull pending or history streams arriving to an authenticated advisor.
   */
  const getIncomingRequestsService = async (mentorId, status) => {
    const requests = await connectRequestRepository.findIncomingRequests(
      mentorId,
      status,
    );

    return Promise.all(
      requests.map(async (r) => {
        const targetReferredById = r.referredBy?._id ?? r.referredBy;

        const referredByProfile = targetReferredById
          ? await mentorProfileRepository.findMentorProfileFull(
              targetReferredById,
            )
          : null;
        return {
          ...toConnectRequestDTO(r),
          referredByProfile: referredByProfile || null,
        };
      }),
    );
  };

  /**
   * Action acceptance or rejection status vectors against active lines.
   */
  const respondToRequestService = async (requestId, mentorUserId, body) => {
    const { status, confirmedSlot } = body;

    if (!["accepted", "rejected"].includes(status)) {
      throw Object.assign(
        new Error("Status must be 'accepted' or 'rejected'"),
        { statusCode: 400 },
      );
    }

    if (
      status === "accepted" &&
      (!confirmedSlot?.date ||
        !confirmedSlot?.startTime ||
        !confirmedSlot?.endTime)
    ) {
      throw Object.assign(
        new Error("confirmedSlot is required when accepting"),
        { statusCode: 400 },
      );
    }

    const request =
      await connectRequestRepository.findByIdWithParticipants(requestId);
    if (!request) {
      throw Object.assign(new Error("Request not found"), { statusCode: 404 });
    }

    const currentMentorId = request.mentor?._id ?? request.mentor;
    if (currentMentorId.toString() !== mentorUserId.toString()) {
      throw Object.assign(
        new Error("Not authorized to respond to this request"),
        { statusCode: 403 },
      );
    }

    if (request.status !== "pending") {
      throw Object.assign(new Error(`Request already ${request.status}`), {
        statusCode: 400,
      });
    }

    request.status = status;
    request.respondedAt = new Date();
    if (status === "accepted") {
      request.confirmedSlot = confirmedSlot;

      // Backfill older or partially populated accepted requests so escrow status routes
      // can return complete session economics metadata.
      if (request.sessionRate == null || request.sessionCount == null) {
        const resolvedSessionCount =
          request.sessionCount ?? request.selectedSlots?.length ?? null;

        let resolvedSessionRate = request.sessionRate;
        if (resolvedSessionRate == null) {
          const mentorProfile =
            await mentorProfileRepository.findMentorProfile(currentMentorId);
          resolvedSessionRate = mentorProfile?.hourlyRate ?? null;
        }

        if (resolvedSessionRate == null) {
          throw Object.assign(
            new Error(
              "Unable to accept request without a valid session rate. Please update the mentor hourly rate.",
            ),
            { statusCode: 400 },
          );
        }
        if (!resolvedSessionCount || resolvedSessionCount < 1) {
          throw Object.assign(
            new Error(
              "Unable to accept request without a valid session count.",
            ),
            { statusCode: 400 },
          );
        }

        request.sessionRate = Number(resolvedSessionRate);
        request.sessionCount = resolvedSessionCount;
        request.totalAmount =
          Number(resolvedSessionRate) * resolvedSessionCount;
      }
    }

    await connectRequestRepository.saveRequest(request);

    const currentMenteeId = request.mentee?._id ?? request.mentee;

    if (socketService?.emitToUser) {
      socketService.emitToUser(
        currentMenteeId.toString(),
        "request_status_changed",
        {
          requestId: request._id.toString(),
          status,
        },
      );
      socketService.emitToUser(
        currentMentorId.toString(),
        "request_status_changed",
        {
          requestId: request._id.toString(),
          status,
        },
      );
    }

    if (status === "accepted") {
      await createNotification({
        recipient: currentMenteeId,
        type: "connect_request_accepted",
        title: "Connect Request Accepted! 🎉",
        message: `${request.mentor.name || "Mentor"} has accepted your connect request. Your session is confirmed on ${confirmedSlot.date} at ${confirmedSlot.startTime}.`,
        metadata: { requestId: request._id, mentorId: currentMentorId },
      });

      if (socketService?.emitToUser) {
        socketService.emitToUser(
          currentMenteeId.toString(),
          "request_accepted",
          {
            title: "Request Accepted! 🎉",
            message: `${request.mentor.name || "Mentor"} accepted your connect request.`,
            type: "success",
          },
        );
      }

      await connectRequestRepository.rejectConflictingSlots(
        request._id,
        currentMentorId,
        confirmedSlot,
      );

      fireAndForgetEmail(
        () =>
          sendRequestAcceptedEmail({
            menteeName: request.mentee.name,
            menteeEmail: request.mentee.email,
            mentorName: request.mentor.name,
            confirmedSlot,
            slots: request.selectedSlots,
          }),
        "Connection Request Accepted Confirmation",
      );
    }

    if (status === "rejected") {
      await createNotification({
        recipient: currentMenteeId,
        type: "connect_request_declined",
        title: "Connect Request Declined",
        message: `${request.mentor.name || "Mentor"} was unable to accept your connect request at this time.`,
        metadata: { requestId: request._id, mentorId: currentMentorId },
      });

      if (socketService?.emitToUser) {
        socketService.emitToUser(
          currentMenteeId.toString(),
          "request_declined",
          {
            title: "Request Declined",
            message: `${request.mentor.name || "Mentor"} was unable to accept your request at this time.`,
            type: "warning",
          },
        );
      }
    }

    return toConnectRequestDTO(request);
  };

  /**
   * Cleanly terminate a session negotiation before transition periods launch.
   */
  const cancelRequestService = async (requestId, menteeUserId) => {
    const request = await connectRequestRepository.findByIdRaw(requestId);
    if (!request) {
      throw Object.assign(new Error("Request not found"), { statusCode: 404 });
    }

    const currentMenteeId = request.mentee?._id ?? request.mentee;
    if (currentMenteeId.toString() !== menteeUserId.toString()) {
      throw Object.assign(new Error("Not authorized to cancel this request"), {
        statusCode: 403,
      });
    }

    if (request.status === "ongoing") {
      throw Object.assign(new Error("Cannot delete an ongoing session"), {
        statusCode: 400,
      });
    }

    await connectRequestRepository.deleteRequestById(requestId);
  };

  /**
   * Transparently delegate an open task out to an alternative system peer.
   */
  const referRequestService = async (requestId, mentorUserId, body) => {
    const { referToMentorId } = body;

    if (!referToMentorId) {
      throw Object.assign(new Error("referToMentorId is required"), {
        statusCode: 400,
      });
    }

    const request =
      await connectRequestRepository.findByIdWithParticipants(requestId);
    if (!request) {
      throw Object.assign(new Error("Request not found"), { statusCode: 404 });
    }

    const currentMentorId = request.mentor?._id ?? request.mentor;
    if (currentMentorId.toString() !== mentorUserId.toString()) {
      throw Object.assign(new Error("Not authorized to refer this request"), {
        statusCode: 403,
      });
    }

    if (request.status !== "pending") {
      throw Object.assign(
        new Error(`Cannot refer a request that is already ${request.status}`),
        { statusCode: 400 },
      );
    }

    if (referToMentorId === mentorUserId.toString()) {
      throw Object.assign(new Error("Cannot refer request to yourself"), {
        statusCode: 400,
      });
    }

    const currentMenteeId = request.mentee?._id ?? request.mentee;

    const existingRequest = await connectRequestRepository.findPendingRequest(
      currentMenteeId,
      referToMentorId,
    );
    if (existingRequest) {
      throw Object.assign(
        new Error("Mentee already has a pending request with this mentor"),
        { statusCode: 409 },
      );
    }

    const newRequest = await connectRequestRepository.createConnectRequest({
      mentee: currentMenteeId,
      mentor: referToMentorId,
      message: request.message,
      selectedSlots: request.selectedSlots,
      requestedAt: new Date(),
      referredBy: mentorUserId,
      sessionRate: request.sessionRate,
      sessionCount: request.sessionCount,
      totalAmount: request.totalAmount,
    });

    await Promise.all([
      createNotification({
        recipient: new mongoose.Types.ObjectId(referToMentorId),
        type: "connect_request_received",
        title: "New Connect Request (Referred)",
        message: `You have received a referred connect request from ${request.mentee.name || "Mentee"}.`,
        metadata: { requestId: newRequest._id, menteeId: currentMenteeId },
      }),
      createNotification({
        recipient: currentMenteeId,
        type: "connect_request_declined",
        title: "Request Referred to Another Mentor",
        message: `${request.mentor.name || "Mentor"} has referred your request to another mentor who may be a better fit.`,
        metadata: { requestId: request._id, mentorId: currentMentorId },
      }),
    ]);

    if (socketService?.emitToUser) {
      socketService.emitToUser(currentMenteeId.toString(), "request_referred", {
        title: "Request Referred",
        message: `${request.mentor.name || "Mentor"} referred your request to another mentor.`,
        type: "info",
      });
      socketService.emitToUser(referToMentorId, "new_connect_request", {
        title: "New Connect Request (Referred) 🔔",
        message: `${request.mentee.name || "Mentee"} was referred to you by ${request.mentor.name || "Mentor"}.`,
        type: "info",
      });
      socketService.emitToUser(
        currentMenteeId.toString(),
        "request_status_changed",
        {
          requestId: request._id.toString(),
          status: "referred",
        },
      );
      socketService.emitToUser(referToMentorId, "request_status_changed", {
        requestId: newRequest._id.toString(),
        status: "pending",
      });
    }

    request.status = "referred";
    request.referredTo = referToMentorId;
    request.referredRequestId = newRequest._id;
    request.respondedAt = new Date();
    await connectRequestRepository.saveRequest(request);

    return {
      originalRequest: toConnectRequestDTO(request),
      newRequest: toConnectRequestDTO(newRequest),
    };
  };

  /**
   * Monitor continuous or active ongoing session pairs.
   */
  const getOngoingConnectsService = async (userId) => {
    const requests = await connectRequestRepository.findOngoingConnects(userId);

    return Promise.all(
      requests.map(async (r) => {
        const menteeId = r.mentee?._id ?? r.mentee;
        const mentorId = r.mentor?._id ?? r.mentor;

        const isMentee = menteeId.toString() === userId.toString();
        if (isMentee) {
          const mentorProfile =
            await mentorProfileRepository.findMentorProfile(mentorId);
          return {
            ...toConnectRequestDTO(r),
            mentorProfile: toMentorProfileDTO(mentorProfile),
          };
        } else {
          const menteeProfile =
            await menteeProfileRepository.findMenteeProfile(menteeId);
          return {
            ...toConnectRequestDTO(r),
            menteeProfile: toMenteeProfileDTO(menteeProfile),
          };
        }
      }),
    );
  };

  /**
   * Retrieve deep dimensional specifications mapping a single transaction ID.
   */
  const getConnectDetailService = async (requestId, userId) => {
    const request =
      await connectRequestRepository.findByIdWithParticipantsLean(requestId);
    if (!request) {
      throw Object.assign(new Error("Session not found"), { statusCode: 404 });
    }

    const menteeId = request.mentee?._id ?? request.mentee;
    const mentorId = request.mentor?._id ?? request.mentor;

    const isMentee = menteeId.toString() === userId.toString();
    const isMentor = mentorId.toString() === userId.toString();

    if (!isMentee && !isMentor) {
      throw Object.assign(new Error("Not authorized to view this session"), {
        statusCode: 403,
      });
    }

    const [mentorProfile, menteeProfile] = await Promise.all([
      mentorProfileRepository.findMentorProfile(mentorId),
      menteeProfileRepository.findMenteeProfile(menteeId),
    ]);

    return {
      ...toConnectRequestDTO(request),
      mentorProfile: toMentorProfileDTO(mentorProfile),
      menteeProfile: toMenteeProfileDTO(menteeProfile),
      viewerRole: isMentee ? "mentee" : "mentor",
    };
  };

  return {
    sendConnectRequestService,
    getMyRequestsService,
    getIncomingRequestsService,
    respondToRequestService,
    cancelRequestService,
    referRequestService,
    getOngoingConnectsService,
    getConnectDetailService,
  };
};

module.exports = createConnectRequestService;
