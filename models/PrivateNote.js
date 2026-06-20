const mongoose = require("mongoose");

const privateNoteSchema = new mongoose.Schema(
  {
    connectRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectRequest",
      required: [
        true,
        "connectRequest session reference identification is required",
      ],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author user reference identification is required"],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [
        200,
        "Private note title description cannot exceed 200 characters",
      ],
      default: "Untitled Note",
    },
    content: {
      type: String,
      trim: true,
      maxlength: [
        20000,
        "Private note content payload volume cannot exceed 20000 characters",
      ],
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Fast queries for all notes by a user in a session
privateNoteSchema.index({ connectRequest: 1, author: 1, createdAt: -1 });

module.exports = mongoose.model("PrivateNote", privateNoteSchema);
