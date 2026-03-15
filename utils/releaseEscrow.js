// backend/utils/releaseEscrow.js
const Wallet      = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const ConnectRequest = require("../models/ConnectRequest");

/**
 * Releases escrowed tokens from mentee → mentor.
 * Called automatically when ALL session slots are marked complete by both parties.
 *
 * @param {string}           connectRequestId
 * @param {mongoose.Session} mongoSession  — pass existing transaction session
 */
const releaseEscrow = async (connectRequestId, mongoSession) => {
  const connectRequest = await ConnectRequest.findById(connectRequestId)
    .session(mongoSession);

  if (!connectRequest) {
    throw new Error("Connect request not found");
  }
  if (connectRequest.paymentStatus !== "paid") {
    throw new Error("No paid escrow found for this session");
  }
  if (connectRequest.status === "completed") {
    throw new Error("Session already completed");
  }

  const { totalAmount, mentee: menteeId, mentor: mentorId } = connectRequest;

  const [menteeWallet, mentorWallet] = await Promise.all([
    Wallet.findOne({ user: menteeId }).session(mongoSession),
    Wallet.findOne({ user: mentorId }).session(mongoSession),
  ]);

  if (!menteeWallet) throw new Error("Mentee wallet not found");
  if (!mentorWallet) throw new Error("Mentor wallet not found");
  if (menteeWallet.escrow < totalAmount) {
    throw new Error("Escrow balance mismatch. Contact support.");
  }

  // ✅ Move tokens: escrow → mentor balance
  menteeWallet.escrow  -= totalAmount;
  mentorWallet.balance += totalAmount;
  await menteeWallet.save({ session: mongoSession });
  await mentorWallet.save({ session: mongoSession });

  // ✅ Mark session completed
  connectRequest.status      = "completed";
  connectRequest.completedAt = new Date();
  await connectRequest.save({ session: mongoSession });

  // ✅ Log transactions
  await Transaction.create(
  [
    {
      user:           menteeId,
      type:           "escrow_release",
      amount:         totalAmount,
      connectRequest: connectRequest._id,
      description:    "Escrow released — all sessions completed by both parties",
      balanceAfter:   menteeWallet.escrow,
    },
    {
      user:           mentorId,
      type:           "credit",
      amount:         totalAmount,
      connectRequest: connectRequest._id,
      description:    "Session payment received — all sessions completed",
      balanceAfter:   mentorWallet.balance,
    },
  ],
  { session: mongoSession, ordered: true } // ✅ add ordered: true
);
  console.log(`✅ Escrow released: ${totalAmount} tokens → mentor for session ${connectRequestId}`);

  return {
    totalAmount,
    menteeEscrow:  menteeWallet.escrow,
    mentorBalance: mentorWallet.balance,
  };
};

module.exports = releaseEscrow;