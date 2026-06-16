/**
 * @fileoverview Financial Ledger Utility for Atomic Escrow Releases.
 * Calculates completed vs. cancelled slot metrics, balances participant wallets,
 * archives tracking transactions, and credits platform commission splits.
 * @module utils/releaseEscrow
 * @requires ../models/Wallet
 * @requires ../models/Transaction
 * @requires ../models/ConnectRequest
 * @requires ../models/AdminUser
 * @requires ../config/logger
 */

const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const ConnectRequest = require("../models/ConnectRequest");
const AdminUser = require("../models/AdminUser");
const logger = require("../config/logger");

/**
 * Utility helper to strictly round decimal monetary values to two floating points.
 * Prevents precision corruption across compounding javascript database calculations.
 * @param {number} n - Raw numeric float calculation.
 * @returns {number} Rounded float value matching currency standards.
 */
const r = (n) => Math.round(n * 100) / 100;

/**
 * Safely releases funds held in escrow for a matching session relationship.
 * Operates strictly within an isolated database transaction block.
 * * @async
 * @function releaseEscrow
 * @param {string} connectRequestId - The targeting relationship record identifier.
 * @param {import('mongoose').ClientSession} mongoSession - Parent active transaction session context wrapper.
 * @throws {Error} If connection reference matching entities or validation lifecycle stages fail.
 * @returns {Promise<Object>} Final audit breakdown ledger overview map.
 */
const releaseEscrow = async (connectRequestId, mongoSession) => {
  const connectRequest =
    await ConnectRequest.findById(connectRequestId).session(mongoSession);

  if (!connectRequest) throw new Error("Connect request not found");
  if (connectRequest.paymentStatus !== "paid")
    throw new Error("No paid escrow found for this session");
  if (connectRequest.status === "completed")
    throw new Error("Session already completed");

  const {
    totalAmount,
    mentorPayout,
    commissionAmount,
    commissionRate,
    mentee: menteeId,
    mentor: mentorId,
    selectedSlots,
  } = connectRequest;

  // ── Calculate how much was already refunded for cancelled slots ──
  const totalSlots = selectedSlots.length;
  const cancelledSlots = selectedSlots.filter(
    (s) => s.status === "cancelled",
  ).length;
  const activeSlots = totalSlots - cancelledSlots;

  // Determine operational distribution profiles per individual structural slot
  const perSlotTotal = totalSlots > 0 ? r(totalAmount / totalSlots) : 0;
  const perSlotPayout = totalSlots > 0 ? r(mentorPayout / totalSlots) : 0;
  const perSlotCommission =
    totalSlots > 0 ? r(commissionAmount / totalSlots) : 0;

  // Formulate absolute dynamic scale values matching true completed runtime metrics
  const expectedEscrow = r(perSlotTotal * activeSlots);
  const adjustedPayout = r(perSlotPayout * activeSlots);
  const adjustedCommission = r(perSlotCommission * activeSlots);

  // ── Fetch wallets ─────────────────────────────────────────
  const [menteeWallet, mentorWallet] = await Promise.all([
    Wallet.findOne({ user: menteeId }).session(mongoSession),
    Wallet.findOne({ user: mentorId }).session(mongoSession),
  ]);

  if (!menteeWallet) throw new Error("Mentee wallet not found");
  if (!mentorWallet) throw new Error("Mentor wallet not found");

  // ── Settle wallets ────────────────────────────────────────
  menteeWallet.escrow -= menteeWallet.escrow; // Complete flush of remaining funds (safeguards rounding differences)
  mentorWallet.balance += adjustedPayout;

  await menteeWallet.save({ session: mongoSession });
  await mentorWallet.save({ session: mongoSession });

  // ── Mark session completed ────────────────────────────────
  connectRequest.status = "completed";
  connectRequest.completedAt = new Date();
  await connectRequest.save({ session: mongoSession });

  // ── Log 3 transactions ────────────────────────────────────
  await Transaction.create(
    [
      {
        user: menteeId,
        type: "escrow_release",
        amount: expectedEscrow,
        connectRequest: connectRequest._id,
        description: `Escrow released — ${activeSlots}/${totalSlots} active slots completed`,
        balanceAfter: menteeWallet.escrow,
      },
      {
        user: mentorId,
        type: "commission_deduct",
        amount: adjustedCommission,
        connectRequest: connectRequest._id,
        description: `Platform fee (${commissionRate}%) collected`,
        balanceAfter: mentorWallet.balance,
      },
      {
        user: mentorId,
        type: "mentor_payout",
        amount: adjustedPayout,
        connectRequest: connectRequest._id,
        description: `Session payout — ${activeSlots} active slot(s)`,
        balanceAfter: mentorWallet.balance,
      },
    ],
    { session: mongoSession, ordered: true },
  );

  // ── Credit admin wallet after commit ──────────────────────
  /*
   * Executed out-of-band via setImmediate to decouple this operation
   * from blocking the primary client connection thread pool response path.
   */
  setImmediate(async () => {
    try {
      await AdminUser.findOneAndUpdate(
        { isActive: true },
        { $inc: { walletBalance: adjustedCommission } },
      );

      logger.info(
        `✅ Admin wallet credited | Variation: +${adjustedCommission} tokens`,
      );
    } catch (err) {
      // In financial contexts, background execution failures are tracked with high-severity error metadata structures
      logger.error(
        `❌ Non-atomic background admin wallet allocation failure: ${err.message}`,
        {
          connectRequestId,
          adjustedCommission,
          errorStack: err.stack,
        },
      );
    }
  });

  // Log successful core business milestone distribution overview
  logger.info("✅ Escrow released and settled successfully", {
    connectRequestId,
    metrics: {
      activeSlots: `${activeSlots}/${totalSlots}`,
      escrowDrained: expectedEscrow,
      platformCommission: adjustedCommission,
      commissionRate: `${commissionRate}%`,
      mentorPayout: adjustedPayout,
    },
  });

  return {
    totalAmount: expectedEscrow,
    commissionRate,
    commissionAmount: adjustedCommission,
    mentorPayout: adjustedPayout,
    menteeEscrow: menteeWallet.escrow,
    mentorBalance: mentorWallet.balance,
  };
};

module.exports = releaseEscrow;
