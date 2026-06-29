/**
 * @fileoverview Billing and Transactional Invoice Document Dispatcher.
 * @module utils/sendInvoiceEmail
 */
const env = require("../config/env");
const generateInvoice = require("./generateInvoice");
const sendWithRetry = require("./sendWithRetry");
const logger = require("../config/logger");
const {
  BLUE_GRADIENT,
  wrapEmail,
  buildHeader,
  FOOTER,
} = require("./emailHelpers");

const BRAND_FROM = `"Leapmentor" <${env.smtp.user}>`;

const sendInvoiceEmail = async (params) => {
  const {
    connectRequestId,
    menteeEmail,
    mentorName,
    sessionRate,
    sessionCount,
    totalAmount,
  } = params;

  if (!menteeEmail || !connectRequestId) {
    logger.error("sendInvoiceEmail: missing required fields", {
      menteeEmail,
      connectRequestId,
    });
    return;
  }

  const invoiceNumber = `INV-${connectRequestId.toString().slice(-8).toUpperCase()}`;

  let pdfBuffer;
  try {
    pdfBuffer = await generateInvoice({ ...params, invoiceNumber });
  } catch (err) {
    logger.error("Invoice PDF generation failed — aborting email", {
      message: err.message,
      connectRequestId: connectRequestId.toString(),
      invoiceNumber,
    });
    return;
  }

  const html = wrapEmail(`
    ${buildHeader(BLUE_GRADIENT, `Invoice #${invoiceNumber}`, `Your payment receipt from LeapMentor`)}
    <div class="email-body" style="padding:24px 32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:18px;border:1px solid #e2e8f0;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
          Billing Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#64748b;padding:5px 0;">Mentor</td>
            <td style="font-size:13px;font-weight:600;color:#1e293b;text-align:right;padding:5px 0;">${mentorName}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding:5px 0;">Sessions</td>
            <td style="font-size:13px;font-weight:600;color:#1e293b;text-align:right;padding:5px 0;">${sessionCount} &times; ${sessionRate} tokens</td>
          </tr>
          <tr>
            <td colspan="2"><div style="border-top:1px solid #e2e8f0;margin:8px 0;"></div></td>
          </tr>
          <tr>
            <td style="font-size:14px;font-weight:700;color:#0f172a;padding:5px 0;">Total Paid</td>
            <td style="font-size:14px;font-weight:700;color:#2563eb;text-align:right;padding:5px 0;">${totalAmount} tokens</td>
          </tr>
        </table>
      </div>
      <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;border:1px solid #bbf7d0;">
        <p style="font-size:13px;color:#15803d;margin:0;font-weight:500;">
          📎 Your invoice PDF is attached to this email for your records.
        </p>
      </div>
    </div>
    ${FOOTER}
  `);

  await sendWithRetry(
    {
      from: BRAND_FROM,
      to: menteeEmail,
      subject: `Your Invoice #${invoiceNumber} — Leapmentor`,
      html,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    },
    "Mentee Invoice Email",
  );

  logger.info("✅ Invoice email dispatched", {
    connectRequestId: connectRequestId.toString(),
    invoiceNumber,
    billingMetrics: {
      recipientMentee: menteeEmail,
      associatedMentor: mentorName,
      unitCount: sessionCount,
      unitRate: `${sessionRate} tokens`,
      aggregateTotal: `${totalAmount} tokens`,
    },
  });
};

module.exports = sendInvoiceEmail;
