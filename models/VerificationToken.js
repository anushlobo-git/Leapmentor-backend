const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Associated account holder profile user reference identity mapping is required",
      ],
    },
    token: {
      type: String,
      trim: true,
      default: null,
    },
    otp: {
      type: String,
      trim: true,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: [
        true,
        "Cryptographic validation token lifecycle chronological expiration datetime limit is required",
      ],
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes for high-performance authentication lookup loops ───────────────────
// Allows efficient targeted cleanups of single-user validation states
verificationTokenSchema.index({ user: 1 });

// Core MongoDB performance optimizer: Automatically drops tokens from disk exactly when they expire
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("VerificationToken", verificationTokenSchema);
