/**
 * @fileoverview Notification Domain Gateway Controller
 * @description Thin network interface wrapper collecting request queries and managing JSON status outputs.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");

const createNotificationController = ({ notificationService }) => {
  const getNotifications = catchAsync(async (req, res, next) => {
    const notifications = await notificationService.getRecipientNotifications(
      req.user._id,
    );
    return sendSuccess(res, { notifications }, "Notifications retrieved");
  });

  const markAllRead = catchAsync(async (req, res, next) => {
    await notificationService.markAllNotificationsAsRead(req.user._id);
    return sendSuccess(res, null, "All notifications marked as read");
  });

  const markOneRead = catchAsync(async (req, res, next) => {
    await notificationService.markOneNotificationAsRead(
      req.params.id,
      req.user._id,
    );
    return sendSuccess(res, null, "Notification marked as read");
  });

  const deleteNotification = catchAsync(async (req, res, next) => {
    await notificationService.removeNotificationRecord(
      req.params.id,
      req.user._id,
    );
    return sendSuccess(res, null, "Notification deleted");
  });

  const clearAll = catchAsync(async (req, res, next) => {
    await notificationService.clearAllUserNotifications(req.user._id);
    return sendSuccess(res, null, "All notifications cleared");
  });

  return {
    getNotifications,
    markAllRead,
    markOneRead,
    deleteNotification,
    clearAll,
  };
};

module.exports = createNotificationController;
