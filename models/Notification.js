const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient user reference identification is required"],
      index: true,
    },
    type: {
      type: String,
      required: [true, "Notification type classification string is required"],
      enum: {
        values: [
          "connect_request_received",
          "connect_request_accepted",
          "connect_request_declined",
          "upcoming_session",
          "new_message",
          "session_completed",
          "new_review",
          "support_resolved",
        ],
        message:
          "{VALUE} is not a valid system notification configuration option",
      },
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Notification title display heading is required"],
      trim: true,
      maxlength: [200, "Notification title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message body content payload is required"],
      trim: true,
      maxlength: [
        1000,
        "Notification body message volume cannot exceed 1000 characters",
      ],
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      menteeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ConnectRequest",
      },
      amount: {
        type: Number,
        min: [0, "Metadata financial values cannot be negative"],
      },
      rating: {
        type: Number,
        min: [0, "Metadata evaluation scoring metrics cannot be less than 0"],
        max: [5, "Metadata evaluation scoring metrics cannot exceed 5"],
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Notification", notificationSchema);
