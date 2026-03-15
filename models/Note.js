// backend/models/Note.js
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    connectRequest: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "ConnectRequest",
      required: true,
    },

    uploadedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    uploaderRole: {
      type:     String,
      enum:     ["mentor", "mentee"],
      required: true,
    },

    // ✅ Optional label given by uploader e.g. "Week 2 Summary"
    title: {
      type:    String,
      trim:    true,
      default: "",
      maxlength: 200,
    },

    // ✅ Cloudinary secure URL — used for preview and download
    fileUrl: {
      type:     String,
      required: true,
    },

    // ✅ Cloudinary public_id — required for deletion
    publicId: {
      type:     String,
      required: true,
    },

    // ✅ Human readable type for icon display in UI
    fileType: {
      type:    String,
      enum:    ["pdf", "image", "doc", "ppt", "excel", "txt", "other"],
      default: "other",
    },

    // ✅ Original filename shown in UI
    fileName: {
      type:    String,
      trim:    true,
      default: "",
    },

    // ✅ File size in bytes — shown as "245 KB" in UI
    fileSize: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// ✅ Fast queries for all notes in a session sorted newest first
noteSchema.index({ connectRequest: 1, createdAt: -1 });

// ✅ Fast queries for notes uploaded by a specific user
noteSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model("Note", noteSchema);