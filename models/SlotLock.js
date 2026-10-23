//Leapmentor-backend/models/SlotLock.js
/**
 * @fileoverview Slot Lock Model
 * @description  Mongoose schema definition for short-term slot lock documents.
 * Enforces strict validation rules, TTL expiration, and unique constraints for scheduling transactions.
 */
const mongoose = require("mongoose");

const slotLockSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Mentor user reference identification is required"],
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Locking user reference identification is required"],
    },
    date: {
      type: String,
      required: [true, "Calendar date tracking target is required"],
      trim: true,
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must follow the absolute continuous YYYY-MM-DD string format constraint",
      ],
    },
    startTime: {
      type: String,
      required: [true, "Slot reservation starting timeframe mark is required"],
      trim: true,
      match: [
        /^\d{2}:\d{2}$/,
        "Start time must precisely align with 24-hour HH:MM notation limits",
      ],
    },
    endTime: {
      type: String,
      required: [
        true,
        "Slot reservation concluding timeframe mark is required",
      ],
      trim: true,
      match: [
        /^\d{2}:\d{2}$/,
        "End time must precisely align with 24-hour HH:MM notation limits",
      ],
    },
    expiresAt: {
      type: Date,
      required: [
        true,
        "Time-to-live cache expiration calendar deadline is required",
      ],
    },
  },
  {
    timestamps: true,
  },
);

// MongoDB auto-deletes document when expiresAt is reached
slotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent double-booking: only one active lock may exist per exact slot tuple,
// regardless of which user holds it. `lockedBy` is intentionally excluded so a
// second user's lock on the same slot fails atomically with an E11000 error.
slotLockSchema.index(
  { mentorId: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true },
);

// Index for fast lookup by mentorId + date
slotLockSchema.index({ mentorId: 1, date: 1 });

module.exports = mongoose.model("SlotLock", slotLockSchema);
