//Leapmentor-backend/models/OAuthAccount.js
const mongoose = require("mongoose");

const oauthAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference identification is required"],
    },
    provider: {
      type: String,
      required: [true, "OAuth provider identity string context is required"],
      enum: {
        values: ["google", "linkedin", "apple"],
        message: "{VALUE} is not a supported provider authorization option",
      },
      trim: true,
    },
    providerId: {
      type: String,
      required: [
        true,
        "External provider identity profile key token is required",
      ],
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index for ultra-fast security profile lookups during social login handshakes
oauthAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });

// Secondary index for fetching all external login profiles associated with a target user
oauthAccountSchema.index({ user: 1 });

module.exports = mongoose.model("OAuthAccount", oauthAccountSchema);
