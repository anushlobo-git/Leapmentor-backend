/**
 * @fileoverview Message Repository
 * @description Direct database access layer mapping all operations to the Message Mongoose model.
 */
const Message = require("../models/Message");

/**
 * Fetches a paginated slice of message records sorted chronologically.
 * @param {string} connectRequestId - Context identifier tracking the chat room.
 * @param {number} skip - Offset skip counter.
 * @param {number} limit - Hard data capacity limit.
 * @returns {Promise<Array<Object>>} Lean array containing message documents.
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
 * @param {string} connectRequestId
 * @returns {Promise<number>} Quantified total count.
 */
const countMessages = (connectRequestId) => {
  return Message.countDocuments({ connectRequest: connectRequestId });
};

/**
 * Bulk updates incoming messages inside a room to mark them as read.
 * @param {string} connectRequestId - Targeted room thread context identifier.
 * @param {string} excludeUserId - User ID of the reader (to avoid marking own messages).
 * @returns {Promise<Object>} Mongoose update write result metadata.
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
 * @param {string} connectRequestId - Targeted connection channel workspace.
 * @param {string} userId - Requesting receiver account context tracking.
 * @returns {Promise<number>} Unread count metric.
 */
const countUnreadMessages = (connectRequestId, userId) => {
  return Message.countDocuments({
    connectRequest: connectRequestId,
    sender: { $ne: userId },
    readAt: null,
  });
};

module.exports = {
  findPaginatedMessages,
  countMessages,
  markMessagesAsRead,
  countUnreadMessages,
};
