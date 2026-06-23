/**
 * @fileoverview Billing and Transactional Invoice Document Dispatcher.
 * Generates dynamic secure PDF binaries and distributes structured invoice
 * statements via centralized automated retries.
 * @module utils/sendInvoiceEmail
 * @requires ./generateInvoice
 * @requires ./sendWithRetry
 * @requires ../config/logger
 */

const generateInvoice = require("./generateInvoice");
const sendWithRetry = require("./sendWithRetry"); // Centralized retry engine
const logger = require("../config/logger");

/** @const {string} LOGO_URL - Remote public secure resource path for branding injects */
const LOGO_URL =
  "https://res.cloudinary.com/dturqwsyo/image/upload/v1775526481/logo_rkj2ta.png";

/**
 * Envelops granular context markups inside defensive, mobile-responsive semantic boilerplates.
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
 * Builds a standardized transactional header layout component block.
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
 * Compiles billing parameter summary tables, runs internal downstream PDF generation engines,
 * and attaches raw invoice binaries to transactional emails with robust retries.
 */
const sendInvoiceEmail = async (params) => {
  const {
    connectRequestId,
    menteeName,
    menteeEmail,
    mentorName,
    sessionRate,
    sessionCount,
    totalAmount,
  } = params;

  // ✅ Input guard
  if (!menteeEmail || !connectRequestId) {
    logger.error("sendInvoiceEmail: missing required fields", {
      menteeEmail,
      connectRequestId,
    });
    return;
  }

  // ✅ Stable invoice number — no Date.now() suffix
  const invoiceNumber = `INV-${connectRequestId.toString().slice(-8).toUpperCase()}`;

  // ✅ PDF generation guarded
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

  const gradient = "linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)";
  const html = wrapEmail(` ... `); // unchanged

  await sendWithRetry(
    {
      from: `"Leapmentor" <${process.env.SMTP_USER}>`,
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
