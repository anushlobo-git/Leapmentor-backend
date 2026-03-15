// backend/utils/generateInvoice.js
const PDFDocument = require("pdfkit");

/**
 * Generates an invoice PDF as a Buffer
 * @param {Object} data
 * @param {string} data.invoiceNumber
 * @param {string} data.menteeName
 * @param {string} data.menteeEmail
 * @param {string} data.mentorName
 * @param {string} data.mentorEmail
 * @param {Object} data.confirmedSlot   - { day, date, startTime, endTime }
 * @param {number} data.sessionRate
 * @param {number} data.sessionCount
 * @param {number} data.totalAmount
 * @param {Date}   data.paidAt
 * @returns {Promise<Buffer>}
 */
const generateInvoice = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        invoiceNumber,
        menteeName,
        menteeEmail,
        mentorName,
        mentorEmail,
        confirmedSlot,
        sessionRate,
        sessionCount,
        totalAmount,
        paidAt,
      } = data;

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // ── Helpers ──────────────────────────────────────────────
      const formatTime = (time) => {
        if (!time) return "";
        const [h, m] = time.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
      };

      const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      };

      const paidDate = paidAt
        ? new Date(paidAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "—";

      // ── Brand header ─────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 80).fill("#1D4ED8");

      doc
        .fillColor("#FFFFFF")
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("Leapmentor", 50, 25);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Mentorship Platform", 50, 55);

      doc.moveDown(3);

      // ── Invoice title + number ───────────────────────────────
      doc
        .fillColor("#1D4ED8")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("INVOICE", 50, 110);

      doc
        .fillColor("#64748B")
        .fontSize(10)
        .font("Helvetica")
        .text(`Invoice No: ${invoiceNumber}`, 50, 138)
        .text(`Date Issued: ${paidDate}`, 50, 153);

      // ── Divider ──────────────────────────────────────────────
      doc
        .moveTo(50, 175)
        .lineTo(545, 175)
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      // ── Billed To / Mentor ───────────────────────────────────
      doc
        .fillColor("#0F172A")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("BILLED TO", 50, 195)
        .font("Helvetica")
        .fillColor("#334155")
        .fontSize(11)
        .text(menteeName, 50, 212)
        .fillColor("#64748B")
        .fontSize(10)
        .text(menteeEmail, 50, 228);

      doc
        .fillColor("#0F172A")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("SESSION WITH", 320, 195)
        .font("Helvetica")
        .fillColor("#334155")
        .fontSize(11)
        .text(mentorName, 320, 212)
        .fillColor("#64748B")
        .fontSize(10)
        .text(mentorEmail, 320, 228);

      // ── Divider ──────────────────────────────────────────────
      doc
        .moveTo(50, 255)
        .lineTo(545, 255)
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      // ── Session details ──────────────────────────────────────
      doc
        .fillColor("#0F172A")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("SESSION DETAILS", 50, 270);

      const sessionDate = confirmedSlot?.date
        ? `${confirmedSlot.day}, ${formatDate(confirmedSlot.date)}`
        : "—";
      const sessionTime = confirmedSlot
        ? `${formatTime(confirmedSlot.startTime)} – ${formatTime(confirmedSlot.endTime)}`
        : "—";

      doc
        .fillColor("#64748B")
        .fontSize(10)
        .font("Helvetica")
        .text(`Date:`, 50, 290)
        .fillColor("#334155")
        .text(sessionDate, 130, 290)
        .fillColor("#64748B")
        .text(`Time:`, 50, 307)
        .fillColor("#334155")
        .text(sessionTime, 130, 307);

      // ── Table header ─────────────────────────────────────────
      doc.rect(50, 340, 495, 30).fill("#F1F5F9");

      doc
        .fillColor("#475569")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Description", 65, 350)
        .text("Rate (tokens)", 280, 350)
        .text("Sessions", 380, 350)
        .text("Total", 470, 350);

      // ── Table row ────────────────────────────────────────────
      doc
        .moveTo(50, 370)
        .lineTo(545, 370)
        .strokeColor("#E2E8F0")
        .lineWidth(0.5)
        .stroke();

      doc
        .fillColor("#334155")
        .fontSize(11)
        .font("Helvetica")
        .text("Mentorship Session", 65, 380)
        .text(`${sessionRate}`, 310, 380)
        .text(`× ${sessionCount}`, 390, 380)
        .font("Helvetica-Bold")
        .text(`${totalAmount}`, 470, 380);

      // ── Total box ────────────────────────────────────────────
      doc
        .moveTo(50, 410)
        .lineTo(545, 410)
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      doc.rect(380, 420, 165, 40).fill("#1D4ED8");

      doc
        .fillColor("#FFFFFF")
        .fontSize(11)
        .font("Helvetica")
        .text("Total Amount", 395, 430)
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(`${totalAmount} tokens`, 460, 430, { align: "right", width: 75 });

      // ── Payment status badge ─────────────────────────────────
      doc.rect(50, 420, 120, 40).fill("#DCFCE7");

      doc
        .fillColor("#166534")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("✓  PAID", 75, 435);

      // ── Footer ───────────────────────────────────────────────
      doc
        .moveTo(50, 490)
        .lineTo(545, 490)
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .stroke();

      doc
        .fillColor("#94A3B8")
        .fontSize(9)
        .font("Helvetica")
        .text(
          "This is a system-generated invoice. Tokens are the internal currency of the Leapmentor platform.",
          50, 502, { align: "center", width: 495 }
        )
        .text("For support, contact support@leapmentor.com", 50, 518, { align: "center", width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generateInvoice;