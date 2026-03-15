const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  token: String,   // for link-based verification
  otp: String,     // for OTP-based verification

  expiresAt: {
    type: Date,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("VerificationToken", verificationTokenSchema);
