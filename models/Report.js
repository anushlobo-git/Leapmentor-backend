//Leapmentor-backend/models/Report.js
const mongoose = require("mongoose");

const COMPLAINT_TYPES = [
  "inappropriate_behavior",
  "session_misconduct",
  "fake_credentials",
  "spam_scam",
  "refund",
  "other",
];

const reportSchema = new mongoose.Schema(
  {
    connectRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectRequest",
      required: [
        true,
        "connectRequest session reference identifier is required",
      ],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "reportedBy user reference identification is required"],
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "reportedUser user reference identification is required",
      ],
    },
    reporterRole: {
      type: String,
      required: [true, "reporterRole identity context is required"],
      enum: {
        values: ["mentor", "mentee"],
        message: "{VALUE} is not a valid reporter role option",
      },
      trim: true,
    },
    complaintType: {
      type: String,
      required: [
        true,
        "complaintType category string classification is required",
      ],
      enum: {
        values: COMPLAINT_TYPES,
        message:
          "{VALUE} is not a recognized system complaint type classification",
      },
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Incident description details narrative is required"],
      trim: true,
      maxlength: [1000, "Incident description cannot exceed 1000 characters"],
    },
    screenshotUrl: {
      type: String,
      trim: true,
      default: "",
    },
    screenshotPublicId: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["open", "under_review", "resolved", "dismissed"],
        message: "{VALUE} is not a valid dispute processing status option",
      },
      default: "open",
      trim: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        "Administrative audit log note cannot exceed 2000 characters",
      ],
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ✅ NEW — track if refund was processed by admin
    refundProcessed: {
      type: Boolean,
      default: false,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.index({ connectRequest: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ connectRequest: 1, reportedBy: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
