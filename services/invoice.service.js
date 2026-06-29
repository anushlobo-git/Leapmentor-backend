/**
 * @fileoverview Invoice Service
 * @description Core business logic layer handling bill validation calculations and PDF generation calls via parameter injection.
 */

const AppError = require("../utils/AppError");

// Upper-case Domain Constants
const VALID_PAYMENT_STATUSES = new Set(["paid", "released"]);

const createInvoiceService = ({
  connectRequestRepository,
  adminUserRepository,
  generateInvoice,
}) => {
  /**
   * Validates session context state attributes and compiles binary invoice PDF buffers.
   * @param {Object} params Operational execution configurations.
   * @param {string} params.connectRequestId Target session identity lookup key parameter pointer.
   * @param {string} params.userId Request initiator credentials identifier track trace.
   * @throws {AppError} 400 | 403 | 404
   * @returns {Promise<Object>} Object container packing the compiled pdfBuffer binary array and formatted invoiceNumber.
   */
  const generateInvoicePdfBuffer = async ({ connectRequestId, userId }) => {
    const connectRequest =
      await connectRequestRepository.findByIdWithParticipantsLean(
        connectRequestId,
      );
    if (!connectRequest) {
      throw new AppError("Session not found", 404);
    }

    if (connectRequest.mentee._id.toString() !== userId.toString()) {
      throw new AppError("Not authorized to download this invoice", 403);
    }

    if (!VALID_PAYMENT_STATUSES.has(connectRequest.paymentStatus)) {
      throw new AppError("No paid invoice found for this session", 400);
    }

    const adminUser = await adminUserRepository.findActiveAdminLean();
    if (!adminUser?.commissionRate) {
      throw new AppError("Platform commission rate not configured", 400);
    }

    const invoiceNumber = `INV-${connectRequestId.toString().slice(-6).toUpperCase()}`;

    const pdfBuffer = await generateInvoice({
      invoiceNumber,
      menteeName: connectRequest.mentee.name,
      menteeEmail: connectRequest.mentee.email,
      mentorName: connectRequest.mentor.name,
      mentorEmail: connectRequest.mentor.email,
      selectedSlots: connectRequest.selectedSlots,
      confirmedSlot: connectRequest.confirmedSlot,
      sessionRate: connectRequest.sessionRate,
      sessionCount: connectRequest.sessionCount,
      totalAmount: connectRequest.totalAmount,
      platformFeePercent: adminUser.commissionRate,
      paidAt: connectRequest.paidAt,
    });

    return { pdfBuffer, invoiceNumber };
  };

  return {
    generateInvoicePdfBuffer,
  };
};

module.exports = createInvoiceService;
