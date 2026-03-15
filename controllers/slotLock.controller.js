// backend/controllers/slotLock.controller.js
const SlotLock       = require("../models/SlotLock");
const ConnectRequest = require("../models/ConnectRequest");

const LOCK_DURATION_MINUTES = 10;

// ── Helpers ───────────────────────────────────────────────────
const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const hasOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && aEnd > bStart;

// ─────────────────────────────────────────────────────────────
// POST /api/slot-locks/lock
// Called when mentee selects a slot in the UI
// ─────────────────────────────────────────────────────────────
const lockSlot = async (req, res) => {
  try {
    const { mentorId, date, startTime, endTime } = req.body;
    const menteeId = req.user._id;

    // ── Validate fields ──
    if (!mentorId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sStart = timeToMinutes(startTime);
    const sEnd   = timeToMinutes(endTime);

    // ── 1. Check confirmed bookings for overlap ──
    const confirmedBookings = await ConnectRequest.find({
      mentor: mentorId,
      status: { $in: ["pending", "accepted"] },
    }).select("selectedSlots selectedSlot").lean();

    const bookedSlots = confirmedBookings.flatMap((r) => {
      const slots = r.selectedSlots || (r.selectedSlot ? [r.selectedSlot] : []);
      return slots.map((s) => ({
        date:      s.date,
        startTime: s.startTime,
        endTime:   s.endTime,
      }));
    });

    const isConfirmedBooked = bookedSlots.some((b) => {
      if (b.date !== date) return false;
      return hasOverlap(sStart, sEnd, timeToMinutes(b.startTime), timeToMinutes(b.endTime));
    });

    if (isConfirmedBooked) {
      return res.status(409).json({
        message: "This slot is already booked",
        code: "SLOT_BOOKED",
      });
    }

    // ── 2. Check active locks for overlap ──
    const activeLocks = await SlotLock.find({ mentorId, date }).lean();

    const isLocked = activeLocks.some((lock) => {
      // Allow mentee to re-lock their own slot (refresh timer)
      if (lock.lockedBy.toString() === menteeId.toString()) return false;
      return hasOverlap(
        sStart, sEnd,
        timeToMinutes(lock.startTime),
        timeToMinutes(lock.endTime)
      );
    });

    if (isLocked) {
      return res.status(409).json({
        message: "This slot is temporarily held by another user",
        code: "SLOT_LOCKED",
      });
    }

    // ── 3. Upsert lock — refreshes timer if same mentee re-selects ──
    const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

    await SlotLock.findOneAndUpdate(
      { mentorId, date, startTime, endTime, lockedBy: menteeId },
      { expiresAt },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message:   "Slot locked successfully",
      expiresAt,
      lockedFor: LOCK_DURATION_MINUTES,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/slot-locks/unlock
// Called when mentee deselects a slot
// ─────────────────────────────────────────────────────────────
const unlockSlot = async (req, res) => {
  try {
    const { mentorId, date, startTime, endTime } = req.body;
    const menteeId = req.user._id;

    if (!mentorId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await SlotLock.findOneAndDelete({
      mentorId,
      date,
      startTime,
      endTime,
      lockedBy: menteeId,
    });

    return res.status(200).json({ message: "Slot unlocked successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/slot-locks/unlock-all
// Called when mentee closes modal or cancels
// ─────────────────────────────────────────────────────────────
const unlockAllByMentee = async (req, res) => {
  try {
    const { mentorId } = req.body;
    const menteeId = req.user._id;

    const filter = { lockedBy: menteeId };
    if (mentorId) filter.mentorId = mentorId;

    await SlotLock.deleteMany(filter);

    return res.status(200).json({ message: "All locks released successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/slot-locks/:mentorId
// Returns active locks for a mentor (excluding requester's own)
// Used internally — not needed by frontend directly
// ─────────────────────────────────────────────────────────────
const getActiveLocks = async (req, res) => {
  try {
    const locks = await SlotLock.find({
      mentorId: req.params.mentorId,
      lockedBy: { $ne: req.user._id },
    }).lean();

    return res.status(200).json({ locks });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  lockSlot,
  unlockSlot,
  unlockAllByMentee,
  getActiveLocks,
};