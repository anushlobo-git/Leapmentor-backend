/**
 * @fileoverview Message Domain Controller
 * @description Thin network interface wrapper collecting transmission parameters and returning formatted JSON items.
 */
const catchAsync = require("../utils/catchAsync");
const messageService = require("../services/message.service");

/**
 * Returns a paginated list of chat history elements matching workspace threads channels.
 * @route   GET /api/v1/messages/:connectRequestId
 * @access  Private
 */
const getMessages = catchAsync(async (req, res) => {
  const result = await messageService.getChatHistory(
    req.params.connectRequestId,
    req.user._id,
    req.query,
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * Returns the quantified total unread metrics matching the current recipient profile.
 * @route   GET /api/v1/messages/:connectRequestId/unread
 * @access  Private
 */
const getUnreadCount = catchAsync(async (req, res) => {
  const result = await messageService.getUnreadMessagesCount(
    req.params.connectRequestId,
    req.user._id,
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  getMessages,
  getUnreadCount,
};
