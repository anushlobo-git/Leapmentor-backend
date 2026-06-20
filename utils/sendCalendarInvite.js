/**
 * @fileoverview Dispatcher utility for Session Notifications and Calendar Attachments.
 * Compiles dynamic responsive HTML wrappers, generates calendar .ics data structures,
 * and distributes automated confirmation payloads to users via Nodemailer SMTP.
 * @module utils/sendCalendarInvite
 * @requires nodemailer
 * @requires ./generateICS
 * @requires ../config/logger
 */

const nodemailer = require("nodemailer");
const { generateICS } = require("./generateICS");
const logger = require("../config/logger");

/** * Native Nodemailer transport coordinator mapping to environmental SMTP targets.
 * @type {import('nodemailer').Transporter}
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // Upgrades to TLS dynamically via STARTTLS over port 587
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/** @const {string} LOGO_URL - Remote public secure resource path for branding injects */
const LOGO_URL =
  "https://res.cloudinary.com/dturqwsyo/image/upload/v1775526481/logo_rkj2ta.png";

/**
 * Normalizes 24-hour military clock strings into readable 12-hour AM/PM representations.
 * @function formatTime
 * @param {string} time - Raw clock index pattern (e.g., '14:30').
 * @returns {string} Standardized time string (e.g., '02:30 PM').
 */
const formatTime = (time) => {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

/**
 * Localizes explicit ISO date stamps into comprehensive western long format vectors.
 * @function formatDate
 * @param {string} date - Raw date string scalar (e.g., '2026-06-15').
 * @returns {string} Formatted string context (e.g., 'Monday, June 15, 2026').
 */
const formatDate = (date) =>
  new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/**
 * Envelops granular context markups inside defensive, mobile-responsive semantic boilerplates.
 * @function wrapEmail
 * @param {string} innerHtml - Core structural body markup stream.
 * @returns {string} Compiled structural document string.
 */
const wrapEmail = (innerHtml) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { margin:0; padding:0; background:#f1f5f9; }
      .preheader { display:none !important; max-height:0; overflow:hidden; mso-hide:all; }
      @media only screen and (max-width:600px) {
        .email-wrapper { border-radius:0 !important; }
        .email-body { padding:20px 16px !important; }
      }
    </style>
  </head>
  <body>
    <div class="preheader" style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f1f5f9;line-height:1px;">
      &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    <div style="padding:24px 16px;background:#f1f5f9;">
      <div class="email-wrapper"
        style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;
        overflow:hidden;border:1px solid #e2e8f0;">
        ${innerHtml}
      </div>
    </div>
  </body>
  </html>
`;

/**
 * Builds a standardized header layout component block.
 * @function buildHeader
 * @param {string} bgGradient - Target linear rendering profile.
 * @param {string} title - Primary title string content.
 * @param {string} subtitle - Secondary description string content.
 * @returns {string} Compiled HTML block header string.
 */
const buildHeader = (bgGradient, title, subtitle) => `
  <div style="background:${bgGradient};padding:28px 32px 24px;text-align:center;">
    <div style="margin-bottom:14px;">
      <div style="display:inline-block;background:#ffffff;border-radius:50%;
        width:56px;height:56px;line-height:56px;text-align:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.15);">
        <img src="${LOGO_URL}" alt="LeapMentor" width="36" height="36"
          style="display:inline-block;vertical-align:middle;width:36px;height:36px;object-fit:contain;" />
      </div>
    </div>
    <div style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;
      letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">
      LEAPMENTOR
    </div>
    <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px;line-height:1.3;">
      ${title}
    </h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">
      ${subtitle}
    </p>
  </div>
`;

/** @const {string} FOOTER - Global application footer boilerplate signature component */
const FOOTER = `
  <div style="padding:18px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">
      LeapMentor &middot; Empowering the next generation of talent
    </p>
  </div>
`;

/**
 * Iterates across active booking slot vectors to build individual semantic schedule interface blocks.
 * @function buildSlotRows
 * @param {Array<Object>} slots - Array containing explicit date, startTime, and endTime records.
 * @returns {string} Compiled repetitive slot layout HTML markup blocks.
 */
const buildSlotRows = (slots) =>
  slots
    .map(
      (slot, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;
      padding:10px 14px;border-radius:10px;margin-bottom:8px;
      background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;">
      <div>
        <div style="font-size:13px;font-weight:700;color:#1e293b;">${formatDate(slot.date)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">
          ${formatTime(slot.startTime)} &ndash; ${formatTime(slot.endTime)}
        </div>
      </div>
      <span style="font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;
        padding:3px 8px;border-radius:6px;white-space:nowrap;flex-shrink:0;">
        Session ${i + 1}
      </span>
    </div>
  `,
    )
    .join("");

/**
 * Assembles transactional email bodies, generates calendar invitation binaries,
 * and distributes confirmation details concurrently across both paired users.
 * * @async
 * @function sendCalendarInvite
 * @param {Object} options - Payload option configuration properties object.
 * @param {string} options.requestId - Target connection matching sequence identifier.
 * @param {string} options.mentorName - Name profile value of the servicing mentor.
 * @param {string} options.mentorEmail - Email address of the servicing mentor.
 * @param {string} options.menteeName - Name profile value of the acquiring user.
 * @param {string} options.menteeEmail - Email address of the acquiring user.
 * @param {Array<Object>} [options.slots=[]] - Targeted operational calendar slots.
 * @param {string} [options.date] - Fallback singular operational date.
 * @param {string} [options.startTime] - Fallback singular start timeframe index.
 * @param {string} [options.endTime] - Fallback singular expiration timeframe index.
 * @param {string} [options.timezone="Asia/Kolkata"] - Dynamic locality scaling variable index.
 * @param {string} [options.message=""] - Accompanying textual introduction notes block.
 * @returns {Promise<void>} Resolves when upstream mail transport links successfully clear.
 */
const sendCalendarInvite = async ({
  requestId,
  mentorName,
  mentorEmail,
  menteeName,
  menteeEmail,
  slots = [],
  date,
  startTime,
  endTime,
  timezone = "Asia/Kolkata",
  message = "",
}) => {
  const allSlots = slots.length > 0 ? slots : [{ date, startTime, endTime }];
  const slotCount = allSlots.length;
  const slotRowsHtml = buildSlotRows(allSlots);

  const icsContent = generateICS({
    requestId,
    mentorName,
    mentorEmail,
    menteeName,
    menteeEmail,
    slots: allSlots,
    timezone,
    message,
  });

  const icsAttachment = {
    filename: "leapmentor-sessions.ics",
    content: icsContent,
    contentType: "text/calendar; method=REQUEST",
  };

  const gradient = "linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)";

  // ── Mentee email compilation ──────────────────────────────
  const menteeHtml = wrapEmail(`
    ${buildHeader(
      gradient,
      `Your ${slotCount} session${slotCount > 1 ? "s are" : " is"} confirmed! 🎉`,
      `Payment received · Sessions locked in with ${mentorName}`,
    )}
    <div class="email-body" style="padding:24px 32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Mentor</div>
        <div style="font-size:15px;font-weight:700;color:#1e293b;">${mentorName}</div>
      </div>

      <div style="margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
          Booked Sessions (${slotCount})
        </div>
        ${slotRowsHtml}
      </div>

      ${
        message
          ? `
      <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;margin-bottom:18px;border-left:3px solid #2563eb;">
        <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Message</div>
        <div style="font-size:13px;color:#334155;line-height:1.6;font-style:italic;">"${message}"</div>
      </div>`
          : ""
      }

      <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;border:1px solid #bbf7d0;">
        <p style="font-size:13px;color:#15803d;margin:0;font-weight:500;">
          📎 ${slotCount} calendar invite${slotCount > 1 ? "s are" : " is"} attached.
          Add ${slotCount > 1 ? "them" : "it"} to Google Calendar, Outlook, or Apple Calendar.
        </p>
      </div>
    </div>
    ${FOOTER}
  `);

  // ── Mentor email compilation ──────────────────────────────
  const mentorHtml = wrapEmail(`
    ${buildHeader(
      gradient,
      `${slotCount} new session${slotCount > 1 ? "s" : ""} scheduled 📅`,
      `${menteeName} has completed payment · Sessions confirmed`,
    )}
    <div class="email-body" style="padding:24px 32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Mentee</div>
        <div style="font-size:15px;font-weight:700;color:#1e293b;">${menteeName}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">${menteeEmail}</div>
      </div>

      <div style="margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
          Scheduled Sessions (${slotCount})
        </div>
        ${slotRowsHtml}
      </div>

      ${
        message
          ? `
      <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;margin-bottom:18px;border-left:3px solid #2563eb;">
        <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
          Message from ${menteeName}
        </div>
        <div style="font-size:13px;color:#334155;line-height:1.6;font-style:italic;">"${message}"</div>
      </div>`
          : ""
      }

      <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;border:1px solid #bbf7d0;">
        <p style="font-size:13px;color:#15803d;margin:0;font-weight:500;">
          📎 ${slotCount} calendar invite${slotCount > 1 ? "s are" : " is"} attached.
          Add ${slotCount > 1 ? "them" : "it"} to your calendar to stay on track.
        </p>
      </div>
    </div>
    ${FOOTER}
  `);

  // Concurrently dispatch transaction payloads across both client email boxes
  await Promise.all([
    transporter.sendMail({
      from: `"Leapmentor" <${process.env.SMTP_USER}>`,
      to: menteeEmail,
      subject: `✅ ${slotCount} Session${slotCount > 1 ? "s" : ""} Confirmed with ${mentorName}`,
      html: menteeHtml,
      attachments: [icsAttachment],
    }),
    transporter.sendMail({
      from: `"Leapmentor" <${process.env.SMTP_USER}>`,
      to: mentorEmail,
      subject: `📅 ${slotCount} New Session${slotCount > 1 ? "s" : ""} with ${menteeName}`,
      html: mentorHtml,
      attachments: [icsAttachment],
    }),
  ]);

  // Document notification delivery milestones using structured log data tracking schemas
  logger.info(
    "✅ Calendar invites and operational confirmation notifications dispatched successfully",
    {
      requestId,
      deliveryMetrics: {
        slotsCount: slotCount,
        recipientMentee: menteeEmail,
        recipientMentor: mentorEmail,
        timezoneScope: timezone,
      },
    },
  );
};

module.exports = { sendCalendarInvite };
