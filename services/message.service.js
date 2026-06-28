/**
 * @fileoverview Message Business Logic Service
 * @description Orchestrates messaging access permissions, pagination boundaries, and clear states via factory pattern.
 */

const AppError = require("../utils/AppError");
const { toMessageDTO } = require("../mappers/message.mapper");

const PAGINATION_DEFAULT_PAGE = 1;
const PAGINATION_DEFAULT_LIMIT = 30;
const PAGINATION_MAX_LIMIT_CAP = 50;

const createMessageService = ({messageRepository, connectRequestRepository}) => {
  /**
   * Validates session membership rights and returns historical text exchanges.
   */
  const getChatHistory = async (
    connectRequestId,
    currentUserId,
    queryOptions,
  ) => {
    const page = Math.max(
      PAGINATION_DEFAULT_PAGE,
      Number.parseInt(queryOptions.page, 10) || PAGINATION_DEFAULT_PAGE,
    );
    const limit = Math.min(
      PAGINATION_MAX_LIMIT_CAP,
      Number.parseInt(queryOptions.limit, 10) || PAGINATION_DEFAULT_LIMIT,
    );
    const skip = (page - 1) * limit;

    const request = await connectRequestRepository.findById(connectRequestId);
    if (!request) {
      throw new AppError(
        "Session context record not found matching criteria",
        404,
      );
    }

    const isMentor = request.mentor.toString() === currentUserId.toString();
    const isMentee = request.mentee.toString() === currentUserId.toString();

    if (!isMentor && !isMentee) {
      throw new AppError(
        "Not authorized to view messages belonging to this session pool",
        403,
      );
    }

    const [messages, totalCount] = await Promise.all([
      messageRepository.findPaginatedMessages(connectRequestId, skip, limit),
      messageRepository.countMessages(connectRequestId),
    ]);

    // Flag active incoming records as read asynchronously
    await messageRepository.markMessagesAsRead(connectRequestId, currentUserId);

    return {
      messages: messages.map(toMessageDTO),
      totalCount,
      page,
      limit,
      hasMore: skip + messages.length < totalCount,
    };
  };

  /**
   * Pulls total outstanding unread text aggregates.
   */
  const getUnreadMessagesCount = async (connectRequestId, currentUserId) => {
    const unreadCount = await messageRepository.countUnreadMessages(
      connectRequestId,
      currentUserId,
    );
    return { unreadCount };
  };

  return {
    getChatHistory,
    getUnreadMessagesCount,
  };
};

module.exports = createMessageService;
