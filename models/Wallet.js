// backend/models/Wallet.js
const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,     
    },

    balance: {
      type: Number,
      default: 0,
      min: 0, // can never go negative
    },

    escrow: {
      type: Number,
      default: 0,
      min: 0, // points held, not yet released to mentor
    },
  },
  { timestamps: true }
);
walletSchema.index({ user: 1, role: 1 }, { unique: true });
module.exports = mongoose.model("Wallet", walletSchema);