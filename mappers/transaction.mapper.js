/**
 * @fileoverview Transaction Ledger Data Transfer Object (DTO) Mapper
 * @description Centralizes system accounting ledger transformations, transaction token styling, and status mapping.
 */

const toTransactionDTO = (tx) => {
  if (!tx) return null;

  // Status Matrix Resolution: Maps internal transactional types to client-friendly pipeline states
  let txStatus = "completed";
  if (tx.type === "escrow_refund") {
    txStatus = "refunded";
  } else if (tx.type === "escrow_hold" || tx.type === "withdrawal") {
    txStatus = "pending";
  }

  return {
    //  Dual-ID Support
    _id: tx._id,
    id: tx._id?.toString(),

    // Customized Audit Ledger Tokens
    txId: tx._id ? `#TRX-${String(tx._id).slice(-5).toUpperCase()}` : "—",

    // User Block Sanitization
    user: {
      name: tx.user?.name || "—",
      email: tx.user?.email || "—",
    },

    amount: tx.amount || 0,
    type: tx.type || "—",
    description: tx.description || "—",
    status: txStatus,

    // Pre-formatted localized date strings
    date: tx.createdAt
      ? new Date(tx.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
  };
};

module.exports = { toTransactionDTO };
