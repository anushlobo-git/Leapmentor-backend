const mongoose = require("mongoose");

const oauthAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  provider: {
    type: String,
    enum: ["google", "linkedin", "apple"],
    required: true
  },

  providerId: {
    type: String,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("OAuthAccount", oauthAccountSchema);
