/**
 * @fileoverview Invoice Domain Controller
 * @description Decoupled transport processing interface transmitting generated document attachments via stream sockets.
 */
const catchAsync = require("../utils/catchAsync");
const invoiceService = require("../services/invoice.service");

/**
 * Handles incoming requests compiling binary transaction confirmation sheets.
 * @route   GET /api/v1/invoices/:connectRequestId
 * @access  Private (Mentee Only)
 */
const downloadInvoice = catchAsync(async (req, res) => {
  const { pdfBuffer, invoiceNumber } =
    await invoiceService.generateInvoicePdfBuffer({
      connectRequestId: req.params.connectRequestId,
      userId: req.user._id,
    });

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="Invoice-${invoiceNumber}.pdf"`,
    "Content-Length": pdfBuffer.length,
  });

  res.status(200).send(pdfBuffer);
});

module.exports = {
  downloadInvoice,
};
