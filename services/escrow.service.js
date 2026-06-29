/**
 * @fileoverview Escrow Service
 * @description Core ledger operations balancing mentee token pools, escrow states,
 * and platform commissions via injection factory logic.
 */

const AppError = require("../utils/AppError");

// Global Domain Constants
const DEFAULT_COMMISSION_RATE = 20;
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const ROLE_MENTEE = "mentee";
const ROLE_MENTOR = "mentor";

const createEscrowService = ({
  mongoose,
  adminUserRepo,
  connectRequestRepo,
  walletRepo,
  transactionRepo,
  mentorProfileRepo,
  availabilityRepo,
  fireAndForgetEmail,
  emailUtils,
  calendarUtils,
  logger,
}) => {
  const { sendInvoiceEmail, sendPaymentReceivedEmail } = emailUtils;
  const { sendCalendarInvite } = calendarUtils;

  /**
   * Side-effects helper triggering notification pipelines completely asynchronously out-of-band.
   * @private
   */
  const _triggerPaySideEffects = (
    connectRequest,
    { sessionRate, sessionCount, totalAmount, mentorAmount, commissionRate },
  ) => {
    fireAndForgetEmail(
      () =>
        sendInvoiceEmail({
          connectRequestId: connectRequest._id.toString(),
          menteeName: connectRequest.mentee.name,
          menteeEmail: connectRequest.mentee.email,
          mentorName: connectRequest.mentor.name,
          mentorEmail: connectRequest.mentor.email,
          selectedSlots: connectRequest.selectedSlots,
          confirmedSlot: connectRequest.confirmedSlot,
          sessionRate,
          sessionCount,
          totalAmount,
          paidAt: connectRequest.paidAt,
        }),
      "Mentee Escrow Payment Invoice Delivery",
    );

    fireAndForgetEmail(
      () =>
        sendPaymentReceivedEmail({
          mentorName: connectRequest.mentor.name,
          mentorEmail: connectRequest.mentor.email,
          menteeName: connectRequest.mentee.name,
          slots: connectRequest.selectedSlots,
          sessionRate,
          sessionCount,
          mentorPayout: mentorAmount,
          commissionRate,
        }),
      "Mentor Payment Received Payout Alert",
    );

    availabilityRepo
      .findAvailabilityByMentor(connectRequest.mentor._id)
      .then((availability) =>
        sendCalendarInvite({
          requestId: connectRequest._id.toString(),
          mentorName: connectRequest.mentor.name,
          mentorEmail: connectRequest.mentor.email,
          menteeName: connectRequest.mentee.name,
          menteeEmail: connectRequest.mentee.email,
          slots: connectRequest.selectedSlots.map(
            ({ date, startTime, endTime }) => ({ date, startTime, endTime }),
          ),
          timezone: availability?.timezone || DEFAULT_TIMEZONE,
          message: connectRequest.message || "",
        }),
      )
      .catch((err) =>
        logger.error("Calendar invite failed", { message: err.message }),
      );
  };

  /**
   * Initiates escrow hold payments on newly accepted connection configurations.
   */
  const pay = async ({
    connectRequestId,
    sessionRate,
    sessionCount,
    menteeId,
  }) => {
    if (!connectRequestId)
      throw new AppError("connectRequestId is required", 400);
    if (!sessionRate || sessionRate < 1)
      throw new AppError("sessionRate must be at least 1", 400);
    if (!sessionCount || sessionCount < 1)
      throw new AppError("sessionCount must be at least 1", 400);

    const admin = await adminUserRepo.findActiveAdmin();
    if (!admin)
      throw new AppError("Platform admin not found. Contact support.", 500);

    const commissionRate = admin.commissionRate ?? DEFAULT_COMMISSION_RATE;
    const mentorAmount = sessionRate * sessionCount;
    const platformFee = Math.ceil((mentorAmount * commissionRate) / 100);
    const totalAmount = mentorAmount + platformFee;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const connectRequest = await connectRequestRepo.findByIdWithParticipants(
        connectRequestId,
        session,
      );
      if (!connectRequest) throw new AppError("Connect request not found", 404);
      if (connectRequest.mentee._id.toString() !== menteeId.toString()) {
        throw new AppError("Not authorized to pay for this request", 403);
      }
      if (connectRequest.status !== "accepted") {
        throw new AppError(
          `Payment only allowed on accepted requests. Current status: ${connectRequest.status}`,
          400,
        );
      }
      if (connectRequest.paymentStatus === "paid") {
        throw new AppError("Payment already made for this session", 409);
      }

      const menteeWallet = await walletRepo.findByUserIdAndRole(
        menteeId,
        ROLE_MENTEE,
        session,
      );
      if (!menteeWallet) throw new AppError("Mentee wallet not found", 404);
      if (menteeWallet.balance < totalAmount) {
        throw new AppError(
          `Insufficient balance. You have ${menteeWallet.balance} tokens but need ${totalAmount}`,
          400,
        );
      }

      menteeWallet.balance -= totalAmount;
      menteeWallet.escrow += totalAmount;
      await walletRepo.save(menteeWallet, session);

      Object.assign(connectRequest, {
        sessionRate,
        sessionCount,
        totalAmount,
        commissionRate,
        commissionAmount: platformFee,
        mentorPayout: mentorAmount,
        paymentStatus: "paid",
        status: "ongoing",
        paidAt: new Date(),
      });
      await connectRequestRepo.save(connectRequest, session);

      await transactionRepo.createMany(
        [
          {
            user: menteeId,
            type: "escrow_hold",
            amount: totalAmount,
            connectRequest: connectRequest._id,
            description: `Escrow hold — ${sessionCount} session(s) × ${sessionRate} tokens + ${commissionRate}% platform fee`,
            balanceAfter: menteeWallet.balance,
          },
        ],
        session,
      );

      await session.commitTransaction();

      _triggerPaySideEffects(connectRequest, {
        sessionRate,
        sessionCount,
        totalAmount,
        mentorAmount,
        commissionRate,
      });

      return {
        mentorAmount,
        platformFee,
        totalAmount,
        commissionRate,
        balance: menteeWallet.balance,
        escrow: menteeWallet.escrow,
        paymentStatus: "paid",
        status: "ongoing",
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  };

  /**
   * Handles escrow payments for single additional session slots requested on ongoing blocks.
   */
  const payAdditional = async ({
    connectRequestId,
    sessionRate,
    slotId,
    menteeId,
  }) => {
    if (!connectRequestId || !sessionRate || !slotId) {
      throw new AppError(
        "connectRequestId, sessionRate, and slotId are required",
        400,
      );
    }
    if (sessionRate < 1)
      throw new AppError("sessionRate must be at least 1", 400);

    const admin = await adminUserRepo.findActiveAdmin();
    if (!admin)
      throw new AppError("Platform admin not found. Contact support.", 500);

    const commissionRate = admin.commissionRate ?? DEFAULT_COMMISSION_RATE;
    const platformFee = Math.ceil((sessionRate * commissionRate) / 100);
    const totalAmount = sessionRate + platformFee;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const connectRequest = await connectRequestRepo.findByIdWithParticipants(
        connectRequestId,
        session,
      );
      if (!connectRequest) throw new AppError("Connect request not found", 404);
      if (connectRequest.mentee._id.toString() !== menteeId.toString()) {
        throw new AppError("Not authorized", 403);
      }
      if (connectRequest.status !== "ongoing") {
        throw new AppError(
          "Additional payment only allowed on ongoing sessions",
          400,
        );
      }

      const additionalSlot = connectRequest.additionalSlots?.id(slotId);
      if (!additionalSlot) throw new AppError("Additional slot not found", 404);
      if (additionalSlot.paymentStatus === "paid") {
        throw new AppError("This slot has already been paid for", 409);
      }

      const menteeWallet = await walletRepo.findByUserId(menteeId, session);
      if (!menteeWallet) throw new AppError("Mentee wallet not found", 404);
      if (menteeWallet.balance < totalAmount) {
        throw new AppError(
          `Insufficient balance. You have ${menteeWallet.balance} tokens but need ${totalAmount}`,
          400,
        );
      }

      menteeWallet.balance -= totalAmount;
      menteeWallet.escrow += totalAmount;
      await walletRepo.save(menteeWallet, session);

      Object.assign(additionalSlot, {
        paymentStatus: "paid",
        paidAt: new Date(),
        sessionRate,
        totalAmount,
      });
      await connectRequestRepo.save(connectRequest, session);

      await transactionRepo.createMany(
        [
          {
            user: menteeId,
            type: "escrow_hold",
            amount: totalAmount,
            connectRequest: connectRequest._id,
            description: `Escrow hold — additional session × ${sessionRate} tokens + ${commissionRate}% platform fee`,
            balanceAfter: menteeWallet.balance,
          },
        ],
        session,
      );

      await session.commitTransaction();

      return {
        sessionRate,
        platformFee,
        totalAmount,
        commissionRate,
        balance: menteeWallet.balance,
        escrow: menteeWallet.escrow,
        slotId,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  };

  /**
   * Releases completed session token values from active escrow hold pools down to clear mentor balances.
   */
  const release = async ({ requestId, menteeId }) => {
    const admin = await adminUserRepo.findActiveAdmin();
    if (!admin)
      throw new AppError("Platform admin not found. Contact support.", 500);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const connectRequest = await connectRequestRepo.findByIdRaw(
        requestId,
        session,
      );
      if (!connectRequest) throw new AppError("Connect request not found", 404);
      if (connectRequest.mentee.toString() !== menteeId.toString()) {
        throw new AppError(
          "Only the mentee can confirm session completion",
          403,
        );
      }
      if (connectRequest.status !== "ongoing") {
        throw new AppError(
          `Release only allowed on ongoing sessions. Current status: ${connectRequest.status}`,
          400,
        );
      }
      if (connectRequest.paymentStatus !== "paid") {
        throw new AppError("No escrowed payment found for this session", 400);
      }

      const {
        totalAmount,
        mentorPayout,
        commissionAmount,
        commissionRate,
        mentor: mentorId,
      } = connectRequest;

      const [menteeWallet, mentorWallet] = await Promise.all([
        walletRepo.findByUserIdAndRole(menteeId, ROLE_MENTEE, session),
        walletRepo.findByUserIdAndRole(mentorId, ROLE_MENTOR, session),
      ]);

      if (!menteeWallet) throw new AppError("Mentee wallet not found", 404);
      if (!mentorWallet) throw new AppError("Mentor wallet not found", 404);
      if (menteeWallet.escrow < totalAmount) {
        throw new AppError("Escrow balance mismatch. Contact support.", 400);
      }

      menteeWallet.escrow -= totalAmount;
      mentorWallet.balance += mentorPayout;

      await walletRepo.save(menteeWallet, session);
      await walletRepo.save(mentorWallet, session);

      await session.commitTransaction();

      await adminUserRepo.incrementWalletBalance(admin._id, commissionAmount);

      connectRequest.status = "completed";
      connectRequest.completedAt = new Date();
      await connectRequestRepo.save(connectRequest);

      await transactionRepo.createMany([
        {
          user: menteeId,
          type: "escrow_release",
          amount: totalAmount,
          connectRequest: connectRequest._id,
          description: "Escrow released on session completion",
          balanceAfter: menteeWallet.escrow,
        },
        {
          user: mentorId,
          type: "commission_deduct",
          amount: commissionAmount,
          connectRequest: connectRequest._id,
          description: `Platform fee (${commissionRate}%) collected`,
          balanceAfter: mentorWallet.balance,
        },
        {
          user: mentorId,
          type: "mentor_payout",
          amount: mentorPayout,
          connectRequest: connectRequest._id,
          description: "Session payout — full rate received",
          balanceAfter: mentorWallet.balance,
        },
      ]);

      return {
        totalAmount,
        commissionRate,
        commissionAmount,
        mentorPayout,
        menteeEscrow: menteeWallet.escrow,
        status: "completed",
      };
    } catch (err) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.warn("Silent transaction abort warning", {
          message: abortErr.message,
        });
      }
      throw err;
    } finally {
      session.endSession();
    }
  };

  /**
   * Reverts whole session escrow holds completely back onto original mentee balance pools following flat breaks.
   */
  const refund = async ({ requestId, userId }) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const connectRequest = await connectRequestRepo.findByIdRaw(
        requestId,
        session,
      );
      if (!connectRequest) throw new AppError("Connect request not found", 404);

      const isMentee = connectRequest.mentee.toString() === userId.toString();
      const isMentor = connectRequest.mentor.toString() === userId.toString();
      if (!isMentee && !isMentor) {
        throw new AppError("Not authorized to refund this session", 403);
      }
      if (connectRequest.paymentStatus !== "paid") {
        throw new AppError("No paid escrow found to refund", 400);
      }
      if (connectRequest.status === "completed") {
        throw new AppError("Cannot refund a completed session", 400);
      }

      const { totalAmount, mentee: menteeId } = connectRequest;

      const menteeWallet = await walletRepo.findByUserId(menteeId, session);
      if (!menteeWallet) throw new AppError("Mentee wallet not found", 404);
      if (menteeWallet.escrow < totalAmount) {
        throw new AppError("Escrow balance mismatch. Contact support.", 400);
      }

      menteeWallet.escrow -= totalAmount;
      menteeWallet.balance += totalAmount;
      await walletRepo.save(menteeWallet, session);

      connectRequest.paymentStatus = "refunded";
      connectRequest.status = "rejected";
      await connectRequestRepo.save(connectRequest, session);

      await transactionRepo.createMany(
        [
          {
            user: menteeId,
            type: "escrow_refund",
            amount: totalAmount,
            connectRequest: connectRequest._id,
            description: "Full refund — session cancelled (incl. platform fee)",
            balanceAfter: menteeWallet.balance,
          },
        ],
        session,
      );

      await session.commitTransaction();

      return {
        totalAmount,
        balance: menteeWallet.balance,
        escrow: menteeWallet.escrow,
        status: "rejected",
        paymentStatus: "refunded",
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  };

  /**
   * Handles fractional slot token returns dynamically derived across live sub-cancellations.
   */
  const refundSlot = async ({ connectRequestId, slotIndex, cancelledBy }) => {
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      const connectRequest = await connectRequestRepo.findByIdRaw(
        connectRequestId,
        mongoSession,
      );
      if (!connectRequest) throw new AppError("Connect request not found", 404);
      if (connectRequest.paymentStatus !== "paid") {
        throw new AppError("No paid escrow found for this session", 400);
      }

      const { totalAmount, mentee: menteeId, selectedSlots } = connectRequest;
      const totalSlotCount = selectedSlots.length;
      if (!totalSlotCount || totalSlotCount < 1) {
        throw new AppError("No slots found on connect request", 400);
      }

      const perSlotRefund = Math.floor(totalAmount / totalSlotCount);
      if (perSlotRefund < 1) {
        throw new AppError("Slot refund amount is too small to process", 400);
      }

      const menteeWallet = await walletRepo.findByUserId(
        menteeId,
        mongoSession,
      );
      if (!menteeWallet) throw new AppError("Mentee wallet not found", 404);
      if (menteeWallet.escrow < perSlotRefund) {
        throw new AppError(
          "Escrow balance too low for slot refund. Contact support.",
          400,
        );
      }

      menteeWallet.escrow -= perSlotRefund;
      menteeWallet.balance += perSlotRefund;
      await walletRepo.save(menteeWallet, mongoSession);

      await transactionRepo.createMany(
        [
          {
            user: menteeId,
            type: "escrow_refund",
            amount: perSlotRefund,
            connectRequest: connectRequest._id,
            description: `Slot #${slotIndex + 1} cancelled by ${cancelledBy} — partial refund of ${perSlotRefund} tokens`,
            balanceAfter: menteeWallet.balance,
          },
        ],
        mongoSession,
      );

      await mongoSession.commitTransaction();

      return {
        refundedAmount: perSlotRefund,
        balance: menteeWallet.balance,
        escrow: menteeWallet.escrow,
      };
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  };

  /**
   * Resolves current escrow structural summaries combined natively across connection details.
   */
  const getStatus = async ({ requestId, userId }) => {
    const connectRequest = await connectRequestRepo.findByIdRaw(requestId);
    if (!connectRequest) throw new AppError("Connect request not found", 404);

    const isMentee = connectRequest.mentee.toString() === userId.toString();
    const isMentor = connectRequest.mentor.toString() === userId.toString();
    if (!isMentee && !isMentor)
      throw new AppError("Not authorized to view this session", 403);

    const admin = await adminUserRepo.findActiveAdmin();
    const commissionRate = admin?.commissionRate ?? DEFAULT_COMMISSION_RATE;
    const menteeWallet = await walletRepo.findByUserId(connectRequest.mentee);

    const sessionCount =
      connectRequest.sessionCount ??
      (Array.isArray(connectRequest.selectedSlots)
        ? connectRequest.selectedSlots.length
        : null);
    let sessionRate = connectRequest.sessionRate ?? null;

    if (sessionRate == null && mentorProfileRepo) {
      const mentorId = connectRequest.mentor?._id ?? connectRequest.mentor;
      if (mentorId) {
        const mentorProfile =
          await mentorProfileRepo.findMentorProfile(mentorId);
        sessionRate = mentorProfile?.hourlyRate ?? null;
      }
    }

    const totalAmount =
      connectRequest.totalAmount ??
      (sessionRate != null && sessionCount != null
        ? sessionRate * sessionCount
        : null);

    return {
      status: connectRequest.status,
      paymentStatus: connectRequest.paymentStatus,
      sessionRate,
      sessionCount,
      totalAmount,
      paidAt: connectRequest.paidAt,
      completedAt: connectRequest.completedAt,
      confirmedSlot: connectRequest.confirmedSlot,
      commissionRate,
      wallet: menteeWallet
        ? { balance: menteeWallet.balance, escrow: menteeWallet.escrow }
        : null,
    };
  };

  /**
   * Exposes internal metrics describing caller-specific token configuration maps.
   */
  const getMyWallet = async (userId) => {
    const wallet = await walletRepo.findByUserId(userId);
    if (!wallet) throw new AppError("Wallet not found", 404);
    return { balance: wallet.balance, escrow: wallet.escrow };
  };

  /**
   * Returns the current platform commission configuration percentage.
   */
  const getCommissionRate = async () => {
    const admin = await adminUserRepo.findActiveAdmin();
    if (!admin?.commissionRate)
      throw new AppError("Commission rate not configured", 404);
    return admin.commissionRate;
  };

  return {
    pay,
    payAdditional,
    release,
    refund,
    refundSlot,
    getStatus,
    getMyWallet,
    getCommissionRate,
  };
};

module.exports = createEscrowService;
