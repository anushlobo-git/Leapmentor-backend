// backend/models/SlotLock.js
const mongoose = require("mongoose");

const slotLockSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date:      { type: String, required: true }, // "YYYY-MM-DD"
  startTime: { type: String, required: true }, // "09:00"
  endTime:   { type: String, required: true }, // "10:00"
  expiresAt: { type: Date,   required: true }, // TTL field
});

// ✅ MongoDB auto-deletes document when expiresAt is reached
slotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ✅ Prevent duplicate locks on same slot by same mentee
slotLockSchema.index(
  { mentorId: 1, date: 1, startTime: 1, endTime: 1, lockedBy: 1 },
  { unique: true }
);

// ✅ Index for fast lookup by mentorId + date
slotLockSchema.index({ mentorId: 1, date: 1 });

module.exports = mongoose.model("SlotLock", slotLockSchema);