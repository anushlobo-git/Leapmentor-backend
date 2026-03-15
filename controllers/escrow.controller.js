// backend/controllers/escrow.controller.js
const mongoose = require("mongoose");
const ConnectRequest = require("../models/ConnectRequest");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const sendInvoiceEmail = require("../utils/sendInvoiceEmail"); // ✅ NEW


const pay = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { connectRequestId, sessionRate, sessionCount } = req.body;
    const menteeId = req.user._id;

    // ── Validate input ────────────────────────────────────────
    if (!connectRequestId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "connectRequestId is required" });
    }
    if (!sessionRate || sessionRate < 1) {
      await session.abortTransaction();
      return res.status(400).json({ message: "sessionRate must be at least 1" });
    }
    if (!sessionCount || sessionCount < 1) {
      await session.abortTransaction();
      return res.status(400).json({ message: "sessionCount must be at least 1" });
    }

    const totalAmount = sessionRate * sessionCount;

    // ── Find and verify the connect request ───────────────────
    // ✅ populate mentee + mentor so we have name/email for invoice
    const connectRequest = await ConnectRequest.findById(connectRequestId)
      .populate("mentee", "name email")
      .populate("mentor", "name email")
      .session(session);

    if (!connectRequest) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Connect request not found" });
    }
    if (connectRequest.mentee._id.toString() !== menteeId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not authorized to pay for this request" });
    }
    if (connectRequest.status !== "accepted") {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Payment only allowed on accepted requests. Current status: ${connectRequest.status}`,
      });
    }
    if (connectRequest.paymentStatus === "paid") {
      await session.abortTransaction();
      return res.status(409).json({ message: "Payment already made for this session" });
    }

    // ── Find mentee wallet and check balance ──────────────────
    const menteeWallet = await Wallet.findOne({ user: menteeId }).session(session);

    if (!menteeWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Mentee wallet not found" });
    }
    if (menteeWallet.balance < totalAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient balance. You have ${menteeWallet.balance} tokens but need ${totalAmount}`,
        balance: menteeWallet.balance,
        required: totalAmount,
      });
    }

    // ── Deduct from balance, add to escrow ────────────────────
    menteeWallet.balance -= totalAmount;
    menteeWallet.escrow  += totalAmount;
    await menteeWallet.save({ session });

    // ── Update connect request ────────────────────────────────
    connectRequest.sessionRate   = sessionRate;
    connectRequest.sessionCount  = sessionCount;
    connectRequest.totalAmount   = totalAmount;
    connectRequest.paymentStatus = "paid";
    connectRequest.status        = "ongoing";
    connectRequest.paidAt        = new Date();
    await connectRequest.save({ session });

    // ── Log escrow_hold transaction ───────────────────────────
    await Transaction.create(
      [
        {
          user:           menteeId,
          type:           "escrow_hold",
          amount:         totalAmount,
          connectRequest: connectRequest._id,
          description:    `Escrow hold — ${sessionCount} session(s) × ${sessionRate} tokens`,
          balanceAfter:   menteeWallet.balance,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // ✅ Send invoice email after commit (non-blocking)
    console.log("💳 Payment committed. Sending invoice email...");
    sendInvoiceEmail({
      connectRequestId: connectRequest._id.toString(),
      menteeName:       connectRequest.mentee.name,
      menteeEmail:      connectRequest.mentee.email,
      mentorName:       connectRequest.mentor.name,
      mentorEmail:      connectRequest.mentor.email,
      confirmedSlot:    connectRequest.confirmedSlot,
      sessionRate,
      sessionCount,
      totalAmount,
      paidAt:           connectRequest.paidAt,
    }).then(() => {
      console.log(`✅ Invoice email sent to ${connectRequest.mentee.email}`);
    }).catch((err) => {
      console.error("❌ Invoice email failed:", err.message);
    });

    return res.status(200).json({
      message:       "Payment successful. Tokens locked in escrow.",
      totalAmount,
      balance:       menteeWallet.balance,
      escrow:        menteeWallet.escrow,
      paymentStatus: "paid",
      status:        "ongoing",
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Escrow pay error:", err);
    return res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};


const release = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { requestId } = req.params;
    const menteeId = req.user._id;

    const connectRequest = await ConnectRequest.findById(requestId).session(session);

    if (!connectRequest) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Connect request not found" });
    }
    if (connectRequest.mentee.toString() !== menteeId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Only the mentee can confirm session completion" });
    }
    if (connectRequest.status !== "ongoing") {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Release only allowed on ongoing sessions. Current status: ${connectRequest.status}`,
      });
    }
    if (connectRequest.paymentStatus !== "paid") {
      await session.abortTransaction();
      return res.status(400).json({ message: "No escrowed payment found for this session" });
    }

    const { totalAmount, mentor: mentorId } = connectRequest;

    const [menteeWallet, mentorWallet] = await Promise.all([
      Wallet.findOne({ user: menteeId }).session(session),
      Wallet.findOne({ user: mentorId }).session(session),
    ]);

    if (!menteeWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Mentee wallet not found" });
    }
    if (!mentorWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Mentor wallet not found" });
    }
    if (menteeWallet.escrow < totalAmount) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Escrow balance mismatch. Contact support." });
    }

    menteeWallet.escrow  -= totalAmount;
    mentorWallet.balance += totalAmount;
    await menteeWallet.save({ session });
    await mentorWallet.save({ session });

    connectRequest.status      = "completed";
    connectRequest.completedAt = new Date();
    await connectRequest.save({ session });

    await Transaction.create(
      [
        {
          user:           menteeId,
          type:           "escrow_release",
          amount:         totalAmount,
          connectRequest: connectRequest._id,
          description:    `Escrow released to mentor on session completion`,
          balanceAfter:   menteeWallet.escrow,
        },
        {
          user:           mentorId,
          type:           "credit",
          amount:         totalAmount,
          connectRequest: connectRequest._id,
          description:    `Session payment received from mentee`,
          balanceAfter:   mentorWallet.balance,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({
      message:      "Session marked complete. Tokens released to mentor.",
      totalAmount,
      menteeEscrow: menteeWallet.escrow,
      status:       "completed",
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Escrow release error:", err);
    return res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};


const refund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const connectRequest = await ConnectRequest.findById(requestId).session(session);

    if (!connectRequest) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Connect request not found" });
    }

    const isMentee = connectRequest.mentee.toString() === userId.toString();
    const isMentor = connectRequest.mentor.toString() === userId.toString();

    if (!isMentee && !isMentor) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not authorized to refund this session" });
    }
    if (connectRequest.paymentStatus !== "paid") {
      await session.abortTransaction();
      return res.status(400).json({ message: "No paid escrow found to refund" });
    }
    if (connectRequest.status === "completed") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cannot refund a completed session" });
    }

    const { totalAmount, mentee: menteeId } = connectRequest;

    const menteeWallet = await Wallet.findOne({ user: menteeId }).session(session);

    if (!menteeWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Mentee wallet not found" });
    }
    if (menteeWallet.escrow < totalAmount) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Escrow balance mismatch. Contact support." });
    }

    menteeWallet.escrow  -= totalAmount;
    menteeWallet.balance += totalAmount;
    await menteeWallet.save({ session });

    connectRequest.paymentStatus = "refunded";
    connectRequest.status        = "rejected";
    await connectRequest.save({ session });

    await Transaction.create(
      [
        {
          user:           menteeId,
          type:           "escrow_refund",
          amount:         totalAmount,
          connectRequest: connectRequest._id,
          description:    `Escrow refunded — session cancelled`,
          balanceAfter:   menteeWallet.balance,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({
      message:       "Escrow refunded successfully. Tokens returned to mentee.",
      totalAmount,
      balance:       menteeWallet.balance,
      escrow:        menteeWallet.escrow,
      status:        "rejected",
      paymentStatus: "refunded",
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Escrow refund error:", err);
    return res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};


const getStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const connectRequest = await ConnectRequest.findById(requestId)
      .select("mentee mentor status paymentStatus sessionRate sessionCount totalAmount paidAt completedAt confirmedSlot")
      .lean();

    if (!connectRequest) {
      return res.status(404).json({ message: "Connect request not found" });
    }

    const isMentee = connectRequest.mentee.toString() === userId.toString();
    const isMentor = connectRequest.mentor.toString() === userId.toString();

    if (!isMentee && !isMentor) {
      return res.status(403).json({ message: "Not authorized to view this session" });
    }

    const menteeWallet = await Wallet.findOne({ user: connectRequest.mentee })
      .select("balance escrow")
      .lean();

    return res.status(200).json({
      status:        connectRequest.status,
      paymentStatus: connectRequest.paymentStatus,
      sessionRate:   connectRequest.sessionRate,
      sessionCount:  connectRequest.sessionCount,
      totalAmount:   connectRequest.totalAmount,
      paidAt:        connectRequest.paidAt,
      completedAt:   connectRequest.completedAt,
      confirmedSlot: connectRequest.confirmedSlot,
      wallet: menteeWallet
        ? { balance: menteeWallet.balance, escrow: menteeWallet.escrow }
        : null,
    });

  } catch (err) {
    console.error("❌ Escrow status error:", err);
    return res.status(500).json({ message: err.message });
  }
};


const getMyWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id }).lean();
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    return res.status(200).json({
      balance: wallet.balance,
      escrow:  wallet.escrow,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


module.exports = { pay, release, refund, getStatus, getMyWallet };