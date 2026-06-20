/**
 * @fileoverview Support Ticket Lifecycle Business Logic Service
 * @description Manages public ticket ingestion, administrative retrievals, and notification workflows.
 */
const AppError = require("../utils/AppError");

// Repositories
const supportMessageRepository = require("../repositories/supportMessage.repository");
const userRepository = require("../repositories/user.repository");
const notificationRepository = require("../repositories/notification.repository");

// Mappers
const { toSupportMessageDTO } = require("../mappers/supportMessage.mapper");

// Out-of-band Notification Helpers
const { sendSupportResolvedEmail } = require("../utils/sendNotificationEmail");

// Upper-case Domain Architecture Constants
const STATUS_OPEN = "open";
const STATUS_RESOLVED = "resolved";
const DEFAULT_USER_ROLE = "user";
const NOTIFICATION_TYPE_RESOLVED = "support_resolved";

/**
 * Registers a new customer support ticket submitted via the public HelpCenter gateway.
 * @param {Object} inputData - Creation parameter keys collection map.
 * @throws {AppError} 400
 * @returns {Promise<Object>} The generated support ticket payload document.
 */
const submitTicket = async (inputData) => {
  const { email, subject, message, role } = inputData;

  if (!email || !subject || !message) {
    throw new AppError(
      "All fields (email, subject, message) are required properties",
      400,
    );
  }

  const ticket = await supportMessageRepository.create({
    email,
    subject,
    message,
    role: role || DEFAULT_USER_ROLE,
    status: STATUS_OPEN,
  });

  //  Enforce serialization layer checks on the newly stored resource document
  return toSupportMessageDTO(ticket);
};

/**
 * Returns a comprehensive historical timeline array containing all logged tickets.
 */
const fetchAllTickets = async () => {
  const tickets = await supportMessageRepository.findAllSortedByNewest();

  //  Format the individual tickets array components uniformly
  return tickets.map(toSupportMessageDTO);
};

/**
 * Resolves an open incident support ticket and dispatches cross-channel alerts.
 * @description Validates ticket existence, matches associated dashboard users,
 * queues persistent database notification alerts, and triggers fire-and-forget resolution emails.
 * @param {string} ticketId - Primary tracking target ticket entity key reference.
 * @throws {AppError} 404
 * @returns {Promise<Object>} The updated ticket record payload.
 */
const resolveTicket = async (ticketId) => {
  const ticket = await supportMessageRepository.updateStatusById(
    ticketId,
    STATUS_RESOLVED,
  );
  if (!ticket) {
    throw new AppError(
      "Target support ticket metadata reference point not found",
      404,
    );
  }

  // Cross-reference user registration mappings by email to determine dashboard alert eligibilities
  const associatedUser = await userRepository.findUserByEmail(ticket.email);

  if (associatedUser) {
    // Uses the new repository helper to prevent Mongoose leaking into the service layer
    await notificationRepository.createNotification({
      recipient: associatedUser._id,
      type: NOTIFICATION_TYPE_RESOLVED,
      title: "Support ticket resolved ✅",
      message: `Your support request "${ticket.subject}" has been resolved by our team.`,
      read: false,
      metadata: {},
    });
  }

  // Execute non-blocking out-of-band network calls to keep primary endpoint response cycles lightning fast
  sendSupportResolvedEmail({
    toEmail: ticket.email,
    subject: ticket.subject,
  }).catch((emailTransmissionError) => {
    console.error(
      "⚠️ Asynchronous support resolution notification email delivery failed:",
      emailTransmissionError.message,
    );
  });

  //  Map out explicit schema variables before transmitting fields to administrative routes
  return toSupportMessageDTO(ticket);
};

module.exports = {
  submitTicket,
  fetchAllTickets,
  resolveTicket,
};
