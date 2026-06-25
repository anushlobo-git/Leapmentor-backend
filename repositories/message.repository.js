/**
 * @fileoverview Message Repository
 * @description Inverted database access layer wrapping operations against the Message Mongoose model.
 */

const createMessageRepository = (Message) => {
  /**
   * Fetches a paginated slice of message records sorted chronologically.
   */
  const findPaginatedMessages = (connectRequestId, skip, limit) => {
    return Message.find({ connectRequest: connectRequestId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  };

  /**
   * Counts the total number of message entries inside a connection request context.
   */
  const countMessages = (connectRequestId) => {
    return Message.countDocuments({ connectRequest: connectRequestId });
  };

  /**
   * Bulk updates incoming messages inside a room to mark them as read.
   */
  const markMessagesAsRead = (connectRequestId, excludeUserId) => {
    return Message.updateMany(
      {
        connectRequest: connectRequestId,
        sender: { $ne: excludeUserId },
        readAt: null,
      },
      { $set: { readAt: new Date() } },
    );
  };

  /**
   * Quantifies the total number of unread incoming messages targeting a recipient.
   */
  const countUnreadMessages = (connectRequestId, userId) => {
    return Message.countDocuments({
      connectRequest: connectRequestId,
      sender: { $ne: userId },
      readAt: null,
    });
  };

  return {
    findPaginatedMessages,
    countMessages,
    markMessagesAsRead,
    countUnreadMessages,
  };
};

module.exports = createMessageRepository;
