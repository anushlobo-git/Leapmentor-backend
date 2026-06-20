//not used anywhere so can delete
const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    email: {
      type: String,
      required: [true, "Contact email verification address is required"],
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      required: [
        true,
        "Support ticket inquiry details core narrative body is required",
      ],
      trim: true,
      maxlength: [
        5000,
        "Support ticket description text volume cannot exceed 5000 characters",
      ],
    },
    category: {
      type: String,
      default: "General",
      trim: true,
      maxlength: [
        100,
        "Category classification name cannot exceed 100 characters",
      ],
    },
    status: {
      type: String,
      required: [
        true,
        "Ticket tracking operational lifecycle status is required",
      ],
      enum: {
        values: ["open", "resolved"],
        message:
          "{VALUE} is not a valid help desk dispute pipeline processing state option",
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

// Performance optimization index arrays tracking high-velocity sorting structures
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ email: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
