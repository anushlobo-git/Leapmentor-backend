// models/Availability.js
const mongoose = require("mongoose");

// ─── Time Slot ────────────────────────────────────────────────
const timeSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5, // "HH:MM"
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "startTime must be in HH:MM format",
      ],
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5, // "HH:MM"
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "endTime must be in HH:MM format",
      ],
    },
  },
  { _id: true },
);

// ─── Day Schedule (weekly recurring) ─────────────────────────
const dayScheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    isAvailable: { type: Boolean, default: false },
    slots: { type: [timeSlotSchema], default: [] },
  },
  { _id: false },
);

// ─── Specific Date Schedule (calendar-based) ──────────────────
// Takes priority over weeklyHours for the same date
const specificDateSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10, // "YYYY-MM-DD"
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
    },
    slots: { type: [timeSlotSchema], default: [] },
  },
  { _id: false },
);

// ─── Availability ─────────────────────────────────────────────
const availabilitySchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
      maxlength: 100,
    },

    sessionDurations: {
      type: [Number],
      default: [30, 60],
      validate: {
        validator: (arr) => arr.every((d) => d > 0 && d <= 480),
        message: "Session durations must be between 1 and 480 minutes",
      },
    },

    weeklyHours: {
      type: [dayScheduleSchema],
      default: () => [
        { day: "Monday", isAvailable: false, slots: [] },
        { day: "Tuesday", isAvailable: false, slots: [] },
        { day: "Wednesday", isAvailable: false, slots: [] },
        { day: "Thursday", isAvailable: false, slots: [] },
        { day: "Friday", isAvailable: false, slots: [] },
        { day: "Saturday", isAvailable: false, slots: [] },
        { day: "Sunday", isAvailable: false, slots: [] },
      ],
    },

    specificDates: {
      type: [specificDateSchema],
      default: [],
    },

    googleCalendarConnected: { type: Boolean, default: false },

    googleCalendarToken: {
      type: String,
      default: "",
      select: false, // Never returned by default queries
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

availabilitySchema.index({ "specificDates.date": 1 });

module.exports = mongoose.model("Availability", availabilitySchema);
