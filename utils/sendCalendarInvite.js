/**
 * @fileoverview Dispatcher utility for Session Notifications and Calendar Attachments.
 * @module utils/sendCalendarInvite
 */

const { generateICS } = require("./generateICS");
const sendWithRetry = require("./sendWithRetry");
const logger = require("../config/logger");
const {
  BLUE_GRADIENT,
  wrapEmail,
  buildHeader,
  FOOTER,
  buildInfoCard,
  buildBanner,
  buildSlotRows,
} = require("./emailHelpers");

const BRAND_FROM = `"Leapmentor" <${process.env.SMTP_USER}>`;

const buildMessageBlock = (message, senderLabel) =>
  message
    ? `<div style="background:#eff6ff;border-radius:12px;padding:14px 16px;margin-bottom:18px;border-left:3px solid #2563eb;">
        <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
          ${senderLabel}
        </div>
        <div style="font-size:13px;color:#334155;line-height:1.6;font-style:italic;">"${message}"</div>
       </div>`
    : "";

const buildCalendarBanner = (slotCount) => `
  <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;border:1px solid #bbf7d0;">
    <p style="font-size:13px;color:#15803d;margin:0;font-weight:500;">
      📎 ${slotCount} calendar invite${slotCount > 1 ? "s are" : " is"} attached.
      Add ${slotCount > 1 ? "them" : "it"} to Google Calendar, Outlook, or Apple Calendar.
    </p>
  </div>
`;

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
  if (!mentorEmail || !menteeEmail) {
    logger.error("sendCalendarInvite: missing required email addresses", {
      requestId,
      mentorEmail,
      menteeEmail,
    });
    return;
  }

  const allSlots =
    slots.length > 0
      ? slots
      : date && startTime && endTime
        ? [{ date, startTime, endTime }]
        : null;

  if (!allSlots?.length) {
    logger.error("sendCalendarInvite: no valid slots provided", { requestId });
    return;
  }

  const slotCount = allSlots.length;
  const slotRowsHtml = buildSlotRows(allSlots);
  const icsAttachment = {
    filename: "leapmentor-sessions.ics",
    content: generateICS({
      requestId,
      mentorName,
      mentorEmail,
      menteeName,
      menteeEmail,
      slots: allSlots,
      timezone,
      message,
    }),
    contentType: "text/calendar; method=REQUEST",
  };

  const menteeHtml = wrapEmail(`
    ${buildHeader(
      BLUE_GRADIENT,
      `Your ${slotCount} session${slotCount > 1 ? "s are" : " is"} confirmed! 🎉`,
      `Payment received · Sessions locked in with ${mentorName}`,
    )}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Mentor", mentorName)}
      <div style="margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
          Booked Sessions (${slotCount})
        </div>
        ${slotRowsHtml}
      </div>
      ${buildMessageBlock(message, "Your Message")}
      ${buildCalendarBanner(slotCount)}
    </div>
    ${FOOTER}
  `);

  const mentorHtml = wrapEmail(`
    ${buildHeader(
      BLUE_GRADIENT,
      `${slotCount} new session${slotCount > 1 ? "s" : ""} scheduled 📅`,
      `${menteeName} has completed payment · Sessions confirmed`,
    )}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Mentee", `${menteeName}<div style="font-size:12px;color:#64748b;margin-top:2px;">${menteeEmail}</div>`)}
      <div style="margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
          Scheduled Sessions (${slotCount})
        </div>
        ${slotRowsHtml}
      </div>
      ${buildMessageBlock(message, `Message from ${menteeName}`)}
      ${buildCalendarBanner(slotCount)}
    </div>
    ${FOOTER}
  `);

  const [menteeResult, mentorResult] = await Promise.allSettled([
    sendWithRetry(
      {
        from: BRAND_FROM,
        to: menteeEmail,
        attachments: [icsAttachment],
        subject: `✅ ${slotCount} Session${slotCount > 1 ? "s" : ""} Confirmed with ${mentorName}`,
        html: menteeHtml,
      },
      "Mentee Calendar Confirmation",
    ),
    sendWithRetry(
      {
        from: BRAND_FROM,
        to: mentorEmail,
        attachments: [icsAttachment],
        subject: `📅 ${slotCount} New Session${slotCount > 1 ? "s" : ""} with ${menteeName}`,
        html: mentorHtml,
      },
      "Mentor Calendar Notification",
    ),
  ]);

  if (menteeResult.status === "rejected")
    logger.error("Mentee calendar email failed permanently", {
      message: menteeResult.reason?.message,
      to: menteeEmail,
    });
  if (mentorResult.status === "rejected")
    logger.error("Mentor calendar email failed permanently", {
      message: mentorResult.reason?.message,
      to: mentorEmail,
    });

  logger.info("Calendar invite dispatch complete", {
    requestId,
    menteeStatus: menteeResult.status,
    mentorStatus: mentorResult.status,
    slotsCount: slotCount,
  });
};

module.exports = { sendCalendarInvite };

