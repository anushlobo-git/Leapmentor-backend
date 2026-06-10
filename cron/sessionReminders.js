// optimal/cron/sessionReminders.js
const cron            = require("node-cron");
const ConnectRequest  = require("../models/ConnectRequest");
const createNotification = require("../utils/createNotification");
const logger          = require("../config/logger");

// ── Helper: convert "YYYY-MM-DD" + "HH:MM" to a JS Date in IST ──
const toISTDate = (dateStr, timeStr) => {
  const [year, month, day]   = dateStr.split("-").map(Number);
  const [hours, minutes]     = timeStr.split(":").map(Number);

  // IST = UTC+5:30, so subtract 5h30m to get UTC
  const utcMs =
    Date.UTC(year, month - 1, day, hours, minutes) - 5.5 * 60 * 60 * 1000;

  return new Date(utcMs);
};

// ── Core reminder function ────────────────────────────────────
const sendSessionReminders = async () => {
  try {
    const now = new Date();
    logger.info("[Cron] Running session reminders", {
      timestamp: now.toISOString(),
    });

    // Find all accepted requests that have a confirmedSlot
    const acceptedRequests = await ConnectRequest.find({
      status: "accepted",
      confirmedSlot: { $ne: null },
    })
      .populate("mentee", "name email")
      .populate("mentor", "name email")
      .lean();

    let reminder24Count = 0;
    let reminder1Count  = 0;

    for (const request of acceptedRequests) {
      const { confirmedSlot, mentee, mentor } = request;

      if (!confirmedSlot?.date || !confirmedSlot?.startTime) continue;

      const sessionTime = toISTDate(confirmedSlot.date, confirmedSlot.startTime);
      const diffMs      = sessionTime - now;
      const diffMins    = diffMs / (1000 * 60);

      // ── 24-hour reminder window: between 23h50m and 24h10m ──
      if (diffMins >= 1430 && diffMins <= 1450) {
        // Notify mentee
        await createNotification({
          recipient: mentee._id,
          type:      "upcoming_session",
          title:     "Session Tomorrow 📅",
          message:   `Reminder: Your session with ${mentor.name} is tomorrow at ${confirmedSlot.startTime} on ${confirmedSlot.date}.`,
          metadata:  { requestId: request._id, mentorId: mentor._id },
        });

        // Notify mentor
        await createNotification({
          recipient: mentor._id,
          type:      "upcoming_session",
          title:     "Session Tomorrow 📅",
          message:   `Reminder: You have a session with ${mentee.name} tomorrow at ${confirmedSlot.startTime} on ${confirmedSlot.date}.`,
          metadata:  { requestId: request._id, menteeId: mentee._id },
        });

        reminder24Count++;
         logger.info("[Cron] 24h reminder sent", { requestId: request._id });
      }

      // ── 1-hour reminder window: between 50m and 70m ──
      if (diffMins >= 50 && diffMins <= 70) {
        // Notify mentee
        await createNotification({
          recipient: mentee._id,
          type:      "upcoming_session",
          title:     "Session in 1 Hour ⏰",
          message:   `Your session with ${mentor.name} starts in about 1 hour at ${confirmedSlot.startTime}.`,
          metadata:  { requestId: request._id, mentorId: mentor._id },
        });

        // Notify mentor
        await createNotification({
          recipient: mentor._id,
          type:      "upcoming_session",
          title:     "Session in 1 Hour ⏰",
          message:   `Your session with ${mentee.name} starts in about 1 hour at ${confirmedSlot.startTime}.`,
          metadata:  { requestId: request._id, menteeId: mentee._id },
        });

        reminder1Count++;
         logger.info("[Cron] 1h reminder sent", { requestId: request._id });
      }
    }

    logger.info("[Cron] Reminders complete", {
      reminder24Count,
      reminder1Count,
    });

  } catch (err) {
    logger.error("[Cron] Session reminder failed", {
      error: err.message,
      stack: err.stack,
    });
  }
};

// ── Scheduler ─────────────────────────────────────────────────
const startSessionReminderCron = () => {
  // Runs every 10 minutes to catch both 24h and 1h windows
  cron.schedule("*/10 * * * *", sendSessionReminders, {
    timezone: "Asia/Kolkata",
  });

  logger.info("[Cron] Session reminders scheduled — runs every 10 minutes IST");
};

module.exports = { startSessionReminderCron, sendSessionReminders };