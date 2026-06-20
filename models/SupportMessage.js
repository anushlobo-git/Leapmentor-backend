const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Sender email address context is required"],
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: [
        true,
        "Support ticket subject line summary heading is required",
      ],
      trim: true,
      maxlength: [
        200,
        "Ticket subject heading summary cannot exceed 200 characters",
      ],
    },
    message: {
      type: String,
      required: [
        true,
        "Support ticket core body description narrative text is required",
      ],
      trim: true,
      maxlength: [
        5000,
        "Support ticket body narrative content volume cannot exceed 5000 characters",
      ],
    },
    role: {
      type: String,
      required: [
        true,
        "Originating profile interaction role designation is required",
      ],
      enum: {
        values: ["mentor", "mentee", "user"],
        message:
          "{VALUE} is not a recognized account interaction profile classification option",
      },
      default: "user",
      trim: true,
    },
    status: {
      type: String,
      required: [
        true,
        "Administrative processing tracking lifecycle status context is required",
      ],
      enum: {
        values: ["open", "resolved"],
        message: "{VALUE} is not a valid dispute pipeline state classification",
      },
      default: "open",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Performance optimization index structures for high-velocity HelpCenter sorting dashboards
supportMessageSchema.index({ status: 1, createdAt: -1 });
supportMessageSchema.index({ email: 1 });

module.exports = mongoose.model("SupportMessage", supportMessageSchema);
