/**
 * @fileoverview Support Ticket Lifecycle Business Logic Service
 * @description Manages public ticket ingestion, administrative retrievals,
 * and notification workflows via constructor factory parameter injection.
 */

const AppError = require("../utils/AppError");

// Upper-case Domain Architecture Constants
const STATUS_OPEN = "open";
const STATUS_RESOLVED = "resolved";
const DEFAULT_USER_ROLE = "user";
const NOTIFICATION_TYPE_RESOLVED = "support_resolved";

const createSupportMessageService = (
  supportMessageRepository,
  userRepository,
  notificationRepository,
  toSupportMessageDTO,
  fireAndForgetEmail,
  sendSupportResolvedEmail,
) => {
  /**
   * Registers a new customer support ticket submitted via the public HelpCenter gateway.
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

    return toSupportMessageDTO(ticket);
  };

  /**
   * Returns a comprehensive historical timeline array containing all logged tickets.
   */
  const fetchAllTickets = async () => {
    const tickets = await supportMessageRepository.findAllSortedByNewest();
    return tickets.map(toSupportMessageDTO);
  };

  /**
   * Resolves an open incident support ticket and dispatches cross-channel alerts.
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

    const associatedUser = await userRepository.findUserByEmail(ticket.email);

    if (associatedUser) {
      await notificationRepository.createNotification({
        recipient: associatedUser._id,
        type: NOTIFICATION_TYPE_RESOLVED,
        title: "Support ticket resolved ✅",
        message: `Your support request "${ticket.subject}" has been resolved by our team.`,
        read: false,
        metadata: {},
      });
    }

    fireAndForgetEmail(
      () =>
        sendSupportResolvedEmail({
          toEmail: ticket.email,
          subject: ticket.subject,
        }),
      "Help Center Support Ticket Resolved Status Update",
    );

    return toSupportMessageDTO(ticket);
  };

  return {
    submitTicket,
    fetchAllTickets,
    resolveTicket,
  };
};

module.exports = createSupportMessageService;
