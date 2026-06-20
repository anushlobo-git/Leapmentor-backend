/**
 * @fileoverview Message Business Logic Service
 * @description Orchestrates messaging access permissions, pagination boundaries, and clear states.
 */
const AppError = require("../utils/AppError");
const messageRepository = require("../repositories/message.repository");
const connectRequestRepository = require("../repositories/connectRequest.repository");

// Upper-case Domain Architecture Constants
const PAGINATION_DEFAULT_PAGE = 1;
const PAGINATION_DEFAULT_LIMIT = 30;
const PAGINATION_MAX_LIMIT_CAP = 50;

/**
 * Validates session membership rights and returns historical text exchanges.
 * @description Evaluates connection bounds, throws immediate 403 blocks for unauthorized actors,
 * loads thread streams asynchronously, and schedules state modifications to mark unread indices as read.
 * @param {string} connectRequestId - Target connection reference channel identity pointer.
 * @param {string} currentUserId - Tracking context verifying individual credentials values.
 * @param {Object} queryOptions - Pagination criteria specifications values mapping.
 * @throws {AppError} 403 | 404
 * @returns {Promise<Object>} Compiled array streams with page-dimension properties parameters tracking.
 */
const getChatHistory = async (
  connectRequestId,
  currentUserId,
  queryOptions,
) => {
  const page = Math.max(
    PAGINATION_DEFAULT_PAGE,
    parseInt(queryOptions.page, 10) || PAGINATION_DEFAULT_PAGE,
  );
  const limit = Math.min(
    PAGINATION_MAX_LIMIT_CAP,
    parseInt(queryOptions.limit, 10) || PAGINATION_DEFAULT_LIMIT,
  );
  const skip = (page - 1) * limit;

  // Utilize existing repository 'findById' method which cleanly executes a raw lean selection fetch
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

  // Execute clean state mutations flagging active incoming records as read asynchronously
  await messageRepository.markMessagesAsRead(connectRequestId, currentUserId);

  return {
    messages,
    totalCount,
    page,
    limit,
    hasMore: skip + messages.length < totalCount,
  };
};

/**
 * Pulls total outstanding unread text aggregates.
 * @param {string} connectRequestId - Targeted room workspace identifier map query reference.
 * @param {string} currentUserId - Active context authentication checkpoint parameter token tracking.
 * @returns {Promise<Object>} Explicit count metrics mapping configuration details properties wrapper.
 */
const getUnreadMessagesCount = async (connectRequestId, currentUserId) => {
  const unreadCount = await messageRepository.countUnreadMessages(
    connectRequestId,
    currentUserId,
  );
  return { unreadCount };
};

module.exports = {
  getChatHistory,
  getUnreadMessagesCount,
};
