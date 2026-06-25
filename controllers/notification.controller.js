/**
 * @fileoverview Notification Domain Gateway Controller
 * @description Thin network interface wrapper collecting request queries and managing JSON status outputs.
 */

const catchAsync = require("../utils/catchAsync");

const createNotificationController = (notificationService) => {
  const getNotifications = catchAsync(async (req, res, next) => {
    const notifications = await notificationService.getRecipientNotifications(
      req.user._id,
    );
    return res.status(200).json({ notifications });
  });

  const markAllRead = catchAsync(async (req, res, next) => {
    await notificationService.markAllNotificationsAsRead(req.user._id);
    return res
      .status(200)
      .json({ message: "All notifications marked as read" });
  });

  const markOneRead = catchAsync(async (req, res, next) => {
    await notificationService.markOneNotificationAsRead(
      req.params.id,
      req.user._id,
    );
    return res.status(200).json({ message: "Notification marked as read" });
  });

  const deleteNotification = catchAsync(async (req, res, next) => {
    await notificationService.removeNotificationRecord(
      req.params.id,
      req.user._id,
    );
    return res.status(200).json({ message: "Notification deleted" });
  });

  const clearAll = catchAsync(async (req, res, next) => {
    await notificationService.clearAllUserNotifications(req.user._id);
    return res.status(200).json({ message: "All notifications cleared" });
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
