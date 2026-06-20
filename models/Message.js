const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    connectRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectRequest",
      required: [
        true,
        "connectRequest session reference identification is required",
      ],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "sender reference identification is required"],
    },
    content: {
      type: String,
      required: [true, "Message content payload cannot be empty"],
      trim: true,
      maxlength: [5000, "Message content volume cannot exceed 5000 characters"],
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//  Compound index for fast paginated queries per session
messageSchema.index({ connectRequest: 1, createdAt: -1 });

// Index for unread count queries
messageSchema.index({ connectRequest: 1, sender: 1, readAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
