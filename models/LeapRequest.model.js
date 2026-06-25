const mongoose = require("mongoose");

const leapRequestSchema = new mongoose.Schema(
  {
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "mentee reference identification is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "{VALUE} is not a valid status option",
      },
      default: "pending",
      trim: true,
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: [0, "currentBalance cannot be less than 0"],
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("LeapRequest", leapRequestSchema);
