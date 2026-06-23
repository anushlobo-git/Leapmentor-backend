/**
 * @fileoverview Transactional Notification Email Dispatcher (11 email types).
 * All shared building blocks live in ./emailHelpers.
 * @module utils/sendNotificationEmail
 */

const sendWithRetry = require("./sendWithRetry");
const logger = require("../config/logger");
const {
  BLUE_GRADIENT,
  RED_GRADIENT,
  GREEN_GRADIENT,
  formatTime,
  formatDate,
  wrapEmail,
  buildHeader,
  FOOTER,
  buildInfoCard,
  buildBanner,
  buildCTA,
  buildStepList,
  buildParticipantBlock,
  buildSlotRows,
  buildColoredSlotRow,
} = require("./emailHelpers");

const BRAND_FROM = `"LeapMentor" <${process.env.SMTP_USER}>`;

// ─── Shared helper: dual-recipient allSettled send ────────────────────────────
const sendToBoth = async (mentorMail, menteeMail, mentorLabel, menteeLabel) => {
  const [mentorResult, menteeResult] = await Promise.allSettled([
    sendWithRetry(mentorMail, mentorLabel),
    sendWithRetry(menteeMail, menteeLabel),
  ]);
  if (mentorResult.status === "rejected")
    logger.error(`${mentorLabel} failed`, {
      message: mentorResult.reason?.message,
      to: mentorMail.to,
    });
  if (menteeResult.status === "rejected")
    logger.error(`${menteeLabel} failed`, {
      message: menteeResult.reason?.message,
      to: menteeMail.to,
    });
};

// ─── Shared helper: inline message quote block ────────────────────────────────
const buildMessageQuote = (message, label) =>
  message
    ? `<div style="background:#eff6ff;border-radius:12px;padding:14px 16px;margin-bottom:18px;border-left:3px solid #2563eb;">
        <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${label}</div>
        <div style="font-size:13px;color:#334155;line-height:1.6;font-style:italic;">"${message}"</div>
       </div>`
    : "";

// ─── Shared helper: section heading + slot rows ───────────────────────────────
const buildSlotSection = (heading, slotsHtml) => `
  <div style="margin-bottom:18px;">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
      ${heading}
    </div>
    ${slotsHtml}
  </div>
`;

// ─── Email 1: Mentor notified when mentee sends a connect request ─────────────
const sendConnectRequestEmail = async ({
  mentorName,
  mentorEmail,
  menteeName,
  slots = [],
  message = "",
}) => {
  if (!mentorEmail || !menteeName) {
    logger.error("sendConnectRequestEmail: missing required fields", {
      mentorEmail,
      menteeName,
    });
    return;
  }

  const html = wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "New Connect Request", `${menteeName} wants to book a session with you`)}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Mentee", menteeName)}
      ${buildSlotSection(`Proposed Slots (${slots.length})`, buildSlotRows(slots))}
      ${buildMessageQuote(message, `Message from ${menteeName}`)}
      ${buildBanner("#f0fdf4", "#bbf7d0", "#15803d", "Log in to your LeapMentor dashboard to accept or decline this request.")}
      ${buildCTA(`${process.env.APP_BASE_URL}/dashboard/mentor?tab=requests`, "View Request", `Opens your <strong>Requests</strong> tab directly`)}
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: mentorEmail,
      subject: `New Connect Request from ${menteeName} — LeapMentor`,
      html,
    },
    "Mentor Connect Request Notification",
  );
  logger.info("Connect request email sent to mentor", { mentorEmail });
};

// ─── Email 2: Mentee notified when mentor accepts the request ─────────────────
const sendRequestAcceptedEmail = async ({
  menteeName,
  menteeEmail,
  mentorName,
  confirmedSlot,
  slots = [],
}) => {
  if (!menteeEmail || !mentorName) {
    logger.error("sendRequestAcceptedEmail: missing required fields", {
      menteeEmail,
      mentorName,
    });
    return;
  }

  const displaySlots = confirmedSlot ? [confirmedSlot] : slots;
  const html = wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "Your request was accepted!", `${mentorName} has accepted your connect request`)}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Your Mentor", mentorName)}
      ${buildSlotSection("Confirmed Session", buildSlotRows(displaySlots))}
      ${buildBanner("#fffbeb", "#fde68a", "#92400e", "Complete your payment on LeapMentor to lock in your session. Tokens are held securely in escrow until the session is complete.")}
      ${buildCTA(`${process.env.APP_BASE_URL}/dashboard/mentee?tab=history`, "Complete Payment", `Opens your <strong>Session History</strong> tab directly`)}
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: menteeEmail,
      subject: `${mentorName} accepted your request — Complete your payment`,
      html,
    },
    "Mentee Request Accepted Notification",
  );
  logger.info("Request accepted email sent to mentee", { menteeEmail });
};

// ─── Email 3: Mentor notified when mentee completes payment ──────────────────
const sendPaymentReceivedEmail = async ({
  mentorName,
  mentorEmail,
  menteeName,
  slots = [],
  sessionRate,
  sessionCount,
  mentorPayout,
  commissionRate,
}) => {
  if (!mentorEmail || !menteeName) {
    logger.error("sendPaymentReceivedEmail: missing required fields", {
      mentorEmail,
      menteeName,
    });
    return;
  }

  const html = wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "Payment Received", `${menteeName} has paid for ${slots.length} session${slots.length > 1 ? "s" : ""} with you`)}
    <div class="email-body" style="padding:24px 32px;">
      ${buildSlotSection(`Booked Sessions (${slots.length})`, buildSlotRows(slots))}
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Payment Summary</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr><td style="font-size:13px;color:#64748b;padding:5px 0;">Rate per session</td><td style="font-size:13px;font-weight:600;color:#1e293b;text-align:right;padding:5px 0;">${sessionRate} tokens</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:5px 0;">Sessions</td><td style="font-size:13px;font-weight:600;color:#1e293b;text-align:right;padding:5px 0;">&times; ${sessionCount}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:5px 0;">Platform fee (${commissionRate}%)</td><td style="font-size:13px;font-weight:600;color:#f59e0b;text-align:right;padding:5px 0;">deducted by platform</td></tr>
          <tr><td colspan="2"><div style="border-top:1px solid #e2e8f0;margin:8px 0;"></div></td></tr>
          <tr><td style="font-size:14px;font-weight:700;color:#0f172a;padding:5px 0;">You will receive</td><td style="font-size:14px;font-weight:700;color:#16a34a;text-align:right;padding:5px 0;">${mentorPayout} tokens</td></tr>
        </table>
      </div>
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: mentorEmail,
      subject: `Payment received from ${menteeName} — ${mentorPayout} tokens in escrow`,
      html,
    },
    "Mentor Payment Received Notification",
  );
  logger.info("Payment received email sent to mentor", { mentorEmail });
};

// ─── Email 4: User notified when admin resolves their support ticket ──────────
const sendSupportResolvedEmail = async ({ toEmail, subject }) => {
  if (!toEmail || !subject) {
    logger.error("sendSupportResolvedEmail: missing required fields", {
      toEmail,
      subject,
    });
    return;
  }

  const html = wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "Your support request is resolved", "Our team has looked into your issue and marked it as resolved.")}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Your Request", subject)}
      ${buildBanner("#f0fdf4", "#bbf7d0", "#15803d", "If your issue is fully resolved, no further action is needed. If you still need help, feel free to submit a new request from the Help Center in your dashboard.")}
      ${buildBanner("#eff6ff", "#2563eb", "#1e40af", "Still having trouble? Open your dashboard &rarr; Help Center &rarr; Send us a message.", true)}
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: toEmail,
      subject: `Your support request has been resolved — LeapMentor`,
      html,
    },
    "User Support Ticket Resolved Notification",
  );
  logger.info("Support resolved email sent", { toEmail });
};

// ─── Email 5: Both notified when a slot is cancelled ─────────────────────────
const sendSlotCancelledEmail = async ({
  connectRequestId,
  mentorName,
  mentorEmail,
  menteeName,
  menteeEmail,
  slot,
  cancelledBy,
  reason = "",
}) => {
  if (
    !mentorEmail ||
    !menteeEmail ||
    !slot?.date ||
    !slot?.startTime ||
    !slot?.endTime
  ) {
    logger.error("sendSlotCancelledEmail: missing required fields", {
      mentorEmail,
      menteeEmail,
      slot,
    });
    return;
  }

  const cancelledByName = cancelledBy === "mentor" ? mentorName : menteeName;
  const dashboardLink = `${process.env.APP_BASE_URL}/shared-dashboard/${connectRequestId}`;

  const buildHtml = (recipientName) =>
    wrapEmail(`
    ${buildHeader(RED_GRADIENT, "Session Slot Cancelled", `${cancelledByName} has cancelled a session slot`)}
    <div class="email-body" style="padding:24px 32px;">
      ${buildParticipantBlock(mentorName, menteeName)}
      ${buildSlotSection("Cancelled Slot", buildColoredSlotRow(slot, "#dc2626", "#fef2f2", "#fecaca", "CANCELLED"))}
      ${
        reason
          ? `<div style="background:#fff7ed;border-radius:12px;padding:14px 16px;margin-bottom:18px;border-left:3px solid #f97316;">
        <div style="font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Reason</div>
        <div style="font-size:13px;color:#334155;line-height:1.6;font-style:italic;">"${reason}"</div>
      </div>`
          : ""
      }
      ${buildBanner("#fffbeb", "#fde68a", "#92400e", `Hi ${recipientName}, this slot has been cancelled by ${cancelledByName}. Please visit your dashboard to view your updated session schedule.`)}
      ${buildCTA(dashboardLink, "View Dashboard")}
    </div>
    ${FOOTER}
  `);

  const subject = `Session slot cancelled — ${formatDate(slot.date)} at ${formatTime(slot.startTime)}`;
  await sendToBoth(
    { from: BRAND_FROM, to: mentorEmail, subject, html: buildHtml(mentorName) },
    "Mentor Slot Cancellation Notice",
    { from: BRAND_FROM, to: menteeEmail, subject, html: buildHtml(menteeName) },
    "Mentee Slot Cancellation Notice",
  );
};

// ─── Email 6: Both notified when a slot is rescheduled ───────────────────────
const sendSlotRescheduledEmail = async ({
  connectRequestId,
  mentorName,
  mentorEmail,
  menteeName,
  menteeEmail,
  oldSlot,
  newSlot,
}) => {
  if (!mentorEmail || !menteeEmail || !oldSlot?.date || !newSlot?.date) {
    logger.error("sendSlotRescheduledEmail: missing required fields", {
      mentorEmail,
      menteeEmail,
      oldSlot,
      newSlot,
    });
    return;
  }

  const dashboardLink = `${process.env.APP_BASE_URL}/shared-dashboard/${connectRequestId}`;

  const buildHtml = (recipientName) =>
    wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "Session Rescheduled", `${menteeName} has rescheduled a session slot`)}
    <div class="email-body" style="padding:24px 32px;">
      ${buildParticipantBlock(mentorName, menteeName)}
      <div style="margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Schedule Change</div>
        <div class="slot-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;margin-bottom:8px;background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Old Time</div>
            <div style="font-size:13px;font-weight:700;color:#1e293b;">${formatDate(oldSlot.date)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">${formatTime(oldSlot.startTime)} &ndash; ${formatTime(oldSlot.endTime)}</div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;padding:3px 8px;border-radius:6px;white-space:nowrap;display:inline-block;flex-shrink:0;align-self:center;">OLD</span>
        </div>
        <div style="text-align:center;padding:4px 0;font-size:16px;color:#94a3b8;">&#8595;</div>
        <div class="slot-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">New Time</div>
            <div style="font-size:13px;font-weight:700;color:#1e293b;">${formatDate(newSlot.date)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">${formatTime(newSlot.startTime)} &ndash; ${formatTime(newSlot.endTime)}</div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#16a34a;background:#dcfce7;padding:3px 8px;border-radius:6px;white-space:nowrap;display:inline-block;flex-shrink:0;align-self:center;">NEW</span>
        </div>
      </div>
      ${buildBanner("#eff6ff", "#2563eb", "#1e40af", `Hi ${recipientName}, your session has been rescheduled by ${menteeName}. Please check your dashboard to confirm the updated time.`, true)}
      ${buildCTA(dashboardLink, "View Dashboard")}
    </div>
    ${FOOTER}
  `);

  await sendToBoth(
    {
      from: BRAND_FROM,
      to: mentorEmail,
      subject: `Session rescheduled by ${menteeName} — ${formatDate(newSlot.date)}`,
      html: buildHtml(mentorName),
    },
    "Mentor Slot Rescheduled Notice",
    {
      from: BRAND_FROM,
      to: menteeEmail,
      subject: `Session rescheduled — New time: ${formatDate(newSlot.date)} at ${formatTime(newSlot.startTime)}`,
      html: buildHtml(menteeName),
    },
    "Mentee Slot Rescheduled Notice",
  );
};

// ─── Email 7: Both notified when mentee adds an additional session ────────────
const sendAdditionalSlotEmail = async ({
  connectRequestId,
  mentorName,
  mentorEmail,
  menteeName,
  menteeEmail,
  slot,
}) => {
  if (!mentorEmail || !menteeEmail || !slot?.date) {
    logger.error("sendAdditionalSlotEmail: missing required fields", {
      mentorEmail,
      menteeEmail,
      slot,
    });
    return;
  }

  const dashboardLink = `${process.env.APP_BASE_URL}/shared-dashboard/${connectRequestId}`;

  const buildHtml = (recipientName) =>
    wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "Additional Session Added", `${menteeName} has added a new session slot`)}
    <div class="email-body" style="padding:24px 32px;">
      ${buildParticipantBlock(mentorName, menteeName)}
      ${buildSlotSection("New Session Slot", buildColoredSlotRow(slot, "#16a34a", "#f0fdf4", "#bbf7d0", "NEW"))}
      ${buildBanner("#eff6ff", "#2563eb", "#1e40af", `Hi ${recipientName}, a new session slot has been added to your ongoing engagement. Visit your dashboard to view the updated schedule.`, true)}
      ${buildCTA(dashboardLink, "View Dashboard")}
    </div>
    ${FOOTER}
  `);

  await sendToBoth(
    {
      from: BRAND_FROM,
      to: mentorEmail,
      subject: `New session slot added by ${menteeName} — LeapMentor`,
      html: buildHtml(mentorName),
    },
    "Mentor Additional Slot Added Notice",
    {
      from: BRAND_FROM,
      to: menteeEmail,
      subject: `Session slot confirmed — ${formatDate(slot.date)} at ${formatTime(slot.startTime)}`,
      html: buildHtml(menteeName),
    },
    "Mentee Additional Slot Added Notice",
  );
};

// ─── Email 8: Mentor notified when they upload verification documents ─────────
const sendDocumentsSubmittedEmail = async ({ mentorName, mentorEmail }) => {
  if (!mentorEmail || !mentorName) {
    logger.error("sendDocumentsSubmittedEmail: missing required fields", {
      mentorEmail,
      mentorName,
    });
    return;
  }

  const html = wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "Application Received", "We've received your verification documents")}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Applicant", mentorName)}
      <div style="background:#eff6ff;border-radius:12px;padding:16px 18px;margin-bottom:18px;border-left:3px solid #2563eb;">
        <p style="font-size:13px;color:#1e40af;margin:0 0 8px;font-weight:600;">Thank you for submitting your documents!</p>
        <p style="font-size:13px;color:#334155;margin:0;line-height:1.6;">Our team will review your profile and documents. This process usually takes <strong>24–48 hours</strong>. You'll receive an email notification once your account has been verified.</p>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">What happens next?</div>
        ${buildStepList(["Admin reviews your resume and work documents", "Your profile is verified and activated", "You're ready to start mentoring on LeapMentor"])}
      </div>
      ${buildCTA(`${process.env.APP_BASE_URL}/dashboard/mentor`, "View Dashboard", "Check your application status anytime")}
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: mentorEmail,
      subject: `We received your documents — Application under review`,
      html,
    },
    "Mentor Document Submission Confirmation",
  );
  logger.info("Documents submitted email sent to mentor", { mentorEmail });
};

// ─── Email 9: Mentor notified when admin verifies their profile ───────────────
const sendMentorVerifiedEmail = async ({ mentorName, mentorEmail }) => {
  if (!mentorEmail || !mentorName) {
    logger.error("sendMentorVerifiedEmail: missing required fields", {
      mentorEmail,
      mentorName,
    });
    return;
  }

  const html = wrapEmail(`
    ${buildHeader(GREEN_GRADIENT, "Account Verified!", "Congratulations — you're now a verified mentor")}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Verified Mentor", `<span style="display:inline-flex;align-items:center;gap:10px;"><span style="font-size:15px;font-weight:700;color:#1e293b;">${mentorName}</span><span style="font-size:11px;font-weight:700;color:#16a34a;background:#dcfce7;padding:3px 8px;border-radius:6px;">VERIFIED</span></span>`)}
      <div style="background:#f0fdf4;border-radius:12px;padding:16px 18px;margin-bottom:18px;border:1px solid #bbf7d0;">
        <p style="font-size:13px;color:#15803d;margin:0 0 8px;font-weight:600;">Welcome to the LeapMentor mentor community!</p>
        <p style="font-size:13px;color:#334155;margin:0;line-height:1.6;">Your profile has been reviewed and verified by our admin team. You can now complete your profile and start receiving mentee connect requests.</p>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Get started</div>
        ${buildStepList(["Complete your mentor profile with bio, skills and expertise", "Set your availability so mentees can book sessions", "Start accepting connect requests from mentees"], "#16a34a")}
      </div>
      ${buildCTA(`${process.env.APP_BASE_URL}/dashboard/mentor`, "Complete Your Profile", "You're one step away from your first session")}
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: mentorEmail,
      subject: `Your account is verified — Welcome to LeapMentor! 🎉`,
      html,
    },
    "Mentor Account Verification Approval",
  );
  logger.info("Mentor verified email sent", { mentorEmail });
};

// ─── Email 10: Reporter notified when they submit a report ────────────────────
const sendReportSubmittedEmail = async ({
  reporterName,
  reporterEmail,
  complaintType,
  description,
  reporterRole,
}) => {
  if (!reporterEmail || !reporterName || !complaintType) {
    logger.error("sendReportSubmittedEmail: missing required fields", {
      reporterEmail,
      reporterName,
      complaintType,
    });
    return;
  }

  const dashboardLink = `${process.env.APP_BASE_URL}/dashboard/${reporterRole === "mentor" ? "mentor" : "mentee"}`;
  const formattedType = complaintType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const html = wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, "Report Submitted", "We've received your report and will review it shortly")}
    <div class="email-body" style="padding:24px 32px;">
      ${buildInfoCard("Submitted By", reporterName)}
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Report Details</div>
        <div style="margin-bottom:10px;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Complaint Type</div>
          <div style="font-size:14px;font-weight:700;color:#1e293b;">${formattedType}</div>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding-top:10px;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Description</div>
          <div style="font-size:13px;color:#334155;line-height:1.6;font-style:italic;">"${description}"</div>
        </div>
      </div>
      ${buildBanner("#eff6ff", "#2563eb", "#1e40af", `Our admin team will review your report and take appropriate action. This usually takes <strong>24–48 hours</strong>. You'll receive an email once it's resolved.`, true)}
      ${buildCTA(dashboardLink, "View Dashboard")}
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: reporterEmail,
      subject: `Your report has been received — LeapMentor`,
      html,
    },
    "User Report Submission Confirmation",
  );
  logger.info("Report submitted email sent", { reporterEmail });
};

// ─── Email 11: Reporter notified when admin resolves/dismisses their report ───
const sendReportResolvedEmail = async ({
  reporterName,
  reporterEmail,
  complaintType,
  status,
  adminNote,
  reporterRole,
}) => {
  if (!reporterEmail || !status || !complaintType) {
    logger.error("sendReportResolvedEmail: missing required fields", {
      reporterEmail,
      status,
      complaintType,
    });
    return;
  }

  const dashboardLink = `${process.env.APP_BASE_URL}/dashboard/${reporterRole === "mentor" ? "mentor" : "mentee"}`;
  const formattedType = complaintType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const isResolved = status === "resolved";
  const statusLabel = isResolved ? "Resolved" : "Dismissed";
  const statusColor = isResolved ? "#16a34a" : "#dc2626";
  const statusBg = isResolved ? "#dcfce7" : "#fee2e2";
  const bannerColors = isResolved
    ? { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" }
    : { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" };
  const bannerMsg = isResolved
    ? "Your report has been reviewed and resolved by our admin team. Thank you for helping keep LeapMentor safe."
    : "After reviewing your report, our admin team has determined that it does not meet the threshold for action. If you believe this is an error, please contact support.";

  const html = wrapEmail(`
    ${buildHeader(isResolved ? GREEN_GRADIENT : RED_GRADIENT, `Report ${statusLabel}`, "An update on your report has been made by our team")}
    <div class="email-body" style="padding:24px 32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Report Summary</div>
        <div style="margin-bottom:10px;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Complaint Type</div>
          <div style="font-size:14px;font-weight:700;color:#1e293b;">${formattedType}</div>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding-top:10px;display:flex;align-items:center;gap:10px;">
          <div style="font-size:11px;color:#94a3b8;">Status</div>
          <span style="font-size:11px;font-weight:700;color:${statusColor};background:${statusBg};padding:3px 8px;border-radius:6px;">${statusLabel.toUpperCase()}</span>
        </div>
      </div>
      ${
        adminNote
          ? `<div style="background:#fffbeb;border-radius:12px;padding:14px 16px;margin-bottom:18px;border-left:3px solid #f59e0b;">
        <div style="font-size:11px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Note from Admin</div>
        <div style="font-size:13px;color:#334155;line-height:1.6;font-style:italic;">"${adminNote}"</div>
      </div>`
          : ""
      }
      ${buildBanner(bannerColors.bg, bannerColors.border, bannerColors.text, bannerMsg)}
      ${buildCTA(dashboardLink, "View Dashboard")}
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: reporterEmail,
      subject: `Your report has been ${statusLabel.toLowerCase()} — LeapMentor`,
      html,
    },
    `User Report Resolution Notification (${statusLabel})`,
  );
  logger.info("Report resolved email sent", {
    reporterEmail,
    status: statusLabel,
  });
};

module.exports = {
  sendConnectRequestEmail,
  sendRequestAcceptedEmail,
  sendPaymentReceivedEmail,
  sendSupportResolvedEmail,
  sendSlotCancelledEmail,
  sendSlotRescheduledEmail,
  sendAdditionalSlotEmail,
  sendDocumentsSubmittedEmail,
  sendMentorVerifiedEmail,
  sendReportSubmittedEmail,
  sendReportResolvedEmail,
};
