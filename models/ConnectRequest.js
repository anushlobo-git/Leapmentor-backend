const mongoose = require("mongoose");

// Additional session slot schema — tracks per-slot payment for extra sessions
const additionalSlotSchema = new mongoose.Schema(
  {
    day:       { type: String, required: true, trim: true, maxlength: 10 },
    date:      { 
      type: String, required: true, trim: true, maxlength: 10, 
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"] 
    },
    startTime: { 
      type: String, required: true, trim: true, maxlength: 5, 
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "startTime must be in HH:MM format"] 
    },
    endTime:   { 
      type: String, required: true, trim: true, maxlength: 5, 
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "endTime must be in HH:MM format"] 
    },

    meetingLink:  { type: String,  default: "", maxlength: 500 },
    menteeMarked: { type: Boolean, default: false },
    mentorMarked: { type: Boolean, default: false },
    completedAt:  { type: Date,    default: null },

    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    paidAt:        { type: Date,   default: null },
    sessionRate:   { type: Number, default: null, min: 0 },
    totalAmount:   { type: Number, default: null, min: 0 },
  },
  { _id: true }
);

// Single slot schema — reused in array
const selectedSlotSchema = new mongoose.Schema(
  {
    day:       { type: String, required: true, trim: true, maxlength: 10 },
    date:      { 
      type: String, required: true, trim: true, maxlength: 10, 
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"] 
    },
    startTime: { 
      type: String, required: true, trim: true, maxlength: 5, 
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "startTime must be in HH:MM format"] 
    },
    endTime:   { 
      type: String, required: true, trim: true, maxlength: 5, 
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "endTime must be in HH:MM format"] 
    },

    meetingLink:        { type: String,  default: "", maxlength: 500 },
    menteeMarked:       { type: Boolean, default: false },
    mentorMarked:       { type: Boolean, default: false },
    completedAt:        { type: Date,    default: null  },

    status: {
      type:    String,
      enum:    ["booked", "cancelled"],
      default: "booked",
    },
    cancelledBy: {
      type:    String,
      enum:    ["mentor", "mentee", null],
      default: null,
    },
    cancelledAt:          { type: Date,   default: null },
    cancellationReason:   { type: String, default: "", maxlength: 500 },

    isRescheduled:        { type: Boolean, default: false },
    rescheduledFromIndex: { type: Number,  default: null  },
  },
  { _id: false }
);

const connectRequestSchema = new mongoose.Schema(
  {
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      maxlength: 500,
      default: "",
      trim: true,
    },
    selectedSlots: {
      type: [selectedSlotSchema],
      required: true,
      validate: {
        validator: function (arr) {
          if (this.isNew) {
            return arr.length >= 1 && arr.length <= 5;
          }
          return arr.length >= 1;
        },
        message: "Please select between 1 and 5 slots",
      },
    },
    confirmedSlot: {
      type: selectedSlotSchema,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "referred", "ongoing", "completed"],
      default: "pending",
    },
    referredTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referredRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectRequest",
      default: null,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Payment / Escrow fields ───────────────────────────────
    sessionRate: { type: Number, default: null, min: 1 },
    sessionCount: { type: Number, default: null, min: 1 },
    totalAmount: { type: Number, default: null, min: 1 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    requestedAt:  { type: Date, default: Date.now },
    respondedAt:  { type: Date, default: null },

    // ── Commission fields ─────────────────────────────────────
    commissionRate: { type: Number, default: null, min: 0, max: 100 },  
    commissionAmount: { type: Number, default: null, min: 0 },
    mentorPayout: { type: Number, default: null, min: 0 },

    // ── Additional Sessions ───────────────────────────────────
    additionalSlots: {
      type:    [additionalSlotSchema],
      default: [],
    },
  },
  { 
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────
connectRequestSchema.index({ mentor: 1, status: 1 });
connectRequestSchema.index({ mentee: 1, status: 1 });
connectRequestSchema.index({ paymentStatus: 1 });
connectRequestSchema.index({ requestedAt: -1 });

// One pending request per mentee-mentor pair at a time
connectRequestSchema.index(
  { mentee: 1, mentor: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

module.exports = mongoose.model("ConnectRequest", connectRequestSchema);