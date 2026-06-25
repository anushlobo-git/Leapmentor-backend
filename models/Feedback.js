//Leapmentor-backend/models/Feedback.js
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    connectRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectRequest",
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromRole: {
      type: String,
      enum: ["mentor", "mentee"],
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be greater than 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// One feedback per user per session
feedbackSchema.index({ connectRequest: 1, from: 1 }, { unique: true });

// Fast lookup for all feedback on a session
feedbackSchema.index({ connectRequest: 1 });

// Fast lookup for all feedback received by a user (for avg rating)
feedbackSchema.index({ to: 1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
