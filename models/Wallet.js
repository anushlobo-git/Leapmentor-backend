// backend/models/Wallet.js
const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["mentor", "mentee"],
      required: false,
    },
    //required: true,
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    escrow: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// Now this index actually works
walletSchema.index({ user: 1, role: 1 }, { unique: true });
walletSchema.index({ user: 1 });
walletSchema.index({ role: 1 });


module.exports = mongoose.model("Wallet", walletSchema);
