/**
 * @fileoverview Shared and Private Note Model Schema
 * @description Manages attachment metadata, asset storage locations (Cloudinary public IDs),
 * and access control configurations for multi-format class artifacts.
 */
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    connectRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectRequest",
      required: [
        true,
        "Active mentorship session workspace reference identity linkage is required",
      ],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Uploader user reference registration identifier is required",
      ],
    },
    uploaderRole: {
      type: String,
      required: [
        true,
        "Uploader account role matrix segment parameter is required",
      ],
      enum: {
        values: ["mentor", "mentee"],
        message:
          "Uploader role assignment must cleanly map to either mentor or mentee structural configurations",
      },
    },
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        200,
        "Attachment item custom text title label cannot exceed 200 characters limit boundaries",
      ],
    },
    fileUrl: {
      type: String,
      required: [
        true,
        "Remote absolute CDN binary storage distribution path URL string is required",
      ],
    },
    publicId: {
      type: String,
      required: [
        true,
        "Cloud provider remote object asset key index dictionary tracking identifier (publicId) is required",
      ],
    },
    fileType: {
      type: String,
      enum: {
        values: ["pdf", "image", "doc", "ppt", "excel", "txt", "other"],
        message:
          "Assigned file extension type category must match an approved operational system asset scope",
      },
      default: "other",
    },
    fileName: {
      type: String,
      trim: true,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0, // Recorded in bytes for data consumption reporting
    },
    // Context isolation metric:
    // true  = strictly visible ONLY to the value inside uploadedBy user path
    // false = open workspace shared note visible to both matching mentor and mentee
    isPrivate: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── HIGH-PERFORMANCE DISCOVERY INDEXES ────────────────────────────────────────

// Optimizes sorting and rendering performance for the chronological shared file feed
noteSchema.index({ connectRequest: 1, createdAt: -1 });

// Accelerates structural workspace cleanup lookups and internal user dashboard aggregations
noteSchema.index({ uploadedBy: 1 });

// Core access-control index: Optimizes the separation of private draft diaries from public session folders
noteSchema.index({ connectRequest: 1, uploadedBy: 1, isPrivate: 1 });

// ── DEFENSIVE COMPILATION GUARD ──────────────────────────────────────────────
// Short-circuits compilation checks to permanently prevent OverwriteModelError crashes in Nodemon/testing environments
module.exports = mongoose.models.Note || mongoose.model("Note", noteSchema);
