// backend/utils/sendCalendarInvite.js
const nodemailer = require("nodemailer");
const { generateICS } = require("./generateICS");

// ── Reuse same transporter pattern as verification.routes.js ──
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Format "HH:MM" → "09:00 AM"
 */
const formatTime = (time) => {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

/**
 * Format "YYYY-MM-DD" → "Monday, March 11, 2024"
 */
const formatDate = (date) => {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Sends calendar invite email to BOTH mentor and mentee
 *
 * @param {Object} params
 * @param {String} params.requestId
 * @param {String} params.mentorName
 * @param {String} params.mentorEmail
 * @param {String} params.menteeName
 * @param {String} params.menteeEmail
 * @param {String} params.date        — "YYYY-MM-DD"
 * @param {String} params.startTime   — "HH:MM"
 * @param {String} params.endTime     — "HH:MM"
 * @param {String} params.timezone    — e.g. "Asia/Kolkata"
 * @param {String} params.message     — mentee's custom message
 */
const sendCalendarInvite = async ({
  requestId,
  mentorName,
  mentorEmail,
  menteeName,
  menteeEmail,
  date,
  startTime,
  endTime,
  timezone = "Asia/Kolkata",
  message = "",
}) => {
  // ── Generate .ics content ──────────────────────────────────
  const icsContent = generateICS({
    requestId,
    mentorName,
    mentorEmail,
    menteeName,
    menteeEmail,
    date,
    startTime,
    endTime,
    timezone,
    message,
  });

  const icsAttachment = {
    filename: "leapmentor-session.ics",
    content: icsContent,
    contentType: "text/calendar; method=REQUEST",
  };

  const formattedDate  = formatDate(date);
  const formattedStart = formatTime(startTime);
  const formattedEnd   = formatTime(endTime);

  // ── Email to MENTEE ───────────────────────────────────────
  const menteeHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 32px 28px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 16px;">🚀</span>
          </div>
          <span style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">LEAPMENTOR</span>
        </div>
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.3;">
          Your session is confirmed! 🎉
        </h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0;">
          Your connect request was accepted by ${mentorName}
        </p>
      </div>

      <!-- Session Details -->
      <div style="padding: 28px 32px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px;">Session Details</h2>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 18px;">👤</span>
              <div>
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Mentor</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${mentorName}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 18px;">📅</span>
              <div>
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Date</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${formattedDate}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 18px;">⏰</span>
              <div>
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Time</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${formattedStart} – ${formattedEnd} <span style="font-size: 12px; color: #64748b; font-weight: 400;">(${timezone})</span></div>
              </div>
            </div>
          </div>
        </div>

        ${message ? `
        <div style="background: #eff6ff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 3px solid #2563eb;">
          <div style="font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Your Message</div>
          <div style="font-size: 14px; color: #334155; line-height: 1.6; font-style: italic;">"${message}"</div>
        </div>` : ""}

        <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; border: 1px solid #bbf7d0;">
          <p style="font-size: 13px; color: #15803d; margin: 0; font-weight: 500;">
            📎 A calendar invite is attached to this email. Add it to your Google Calendar, Outlook, or Apple Calendar to get a reminder.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          LeapMentor · Empowering the next generation of talent
        </p>
      </div>
    </div>
  `;

  // ── Email to MENTOR ───────────────────────────────────────
  const mentorHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      
      <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 32px 28px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 8px;">
            <span style="color: white; font-size: 16px; padding: 6px; display: block;">🚀</span>
          </div>
          <span style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">LEAPMENTOR</span>
        </div>
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.3;">
          New session scheduled 📅
        </h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0;">
          You accepted a mentorship request from ${menteeName}
        </p>
      </div>

      <div style="padding: 28px 32px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px;">Session Details</h2>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 18px;">👤</span>
              <div>
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Mentee</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${menteeName}</div>
                <div style="font-size: 12px; color: #64748b;">${menteeEmail}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 18px;">📅</span>
              <div>
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Date</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${formattedDate}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 18px;">⏰</span>
              <div>
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Time</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${formattedStart} – ${formattedEnd} <span style="font-size: 12px; color: #64748b; font-weight: 400;">(${timezone})</span></div>
              </div>
            </div>
          </div>
        </div>

        ${message ? `
        <div style="background: #eff6ff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 3px solid #2563eb;">
          <div style="font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Message from ${menteeName}</div>
          <div style="font-size: 14px; color: #334155; line-height: 1.6; font-style: italic;">"${message}"</div>
        </div>` : ""}

        <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; border: 1px solid #bbf7d0;">
          <p style="font-size: 13px; color: #15803d; margin: 0; font-weight: 500;">
            📎 A calendar invite is attached. Add it to your calendar to stay on track.
          </p>
        </div>
      </div>

      <div style="padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          LeapMentor · Empowering the next generation of talent
        </p>
      </div>
    </div>
  `;

  // ── Send both emails in parallel ──────────────────────────
  await Promise.all([
    transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: menteeEmail,
      subject: `✅ Session Confirmed with ${mentorName} · ${formattedDate}`,
      html: menteeHtml,
      attachments: [icsAttachment],
    }),
    transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: mentorEmail,
      subject: `📅 New Session with ${menteeName} · ${formattedDate}`,
      html: mentorHtml,
      attachments: [icsAttachment],
    }),
  ]);

  console.log(`✅ Calendar invites sent to ${menteeEmail} and ${mentorEmail}`);
};

module.exports = { sendCalendarInvite };