/**
 * @fileoverview Notification Domain Gateway Controller
 * @description Thin network interface wrapper validating queries contexts parameters and managing JSON outputs status mappings.
 */
const catchAsync = require("../utils/catchAsync");
const notificationService = require("../services/notification.service");

/**
 * Pulls an array listing containing alerts matching current account cookies.
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.getRecipientNotifications(
    req.user._id,
  );
  res.status(200).json({ notifications });
});

/**
 * Flips multiple tracking statuses across target alert indices records fields arrays.
 * @route   PATCH /api/v1/notifications/mark-all-read
 * @access  Private
 */
const markAllRead = catchAsync(async (req, res) => {
  await notificationService.markAllNotificationsAsRead(req.user._id);
  res.status(200).json({ message: "All notifications marked as read" });
});

/**
 * References a specific alert object mapping parameter converting read flag configurations.
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
const markOneRead = catchAsync(async (req, res) => {
  await notificationService.markOneNotificationAsRead(
    req.params.id,
    req.user._id,
  );
  res.status(200).json({ message: "Notification marked as read" });
});

/**
 * Safely unlinks a target alert from the document collections.
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
const deleteNotification = catchAsync(async (req, res) => {
  await notificationService.removeNotificationRecord(
    req.params.id,
    req.user._id,
  );
  res.status(200).json({ message: "Notification deleted" });
});

/**
 * Clears the entire alert record trace dataset matching the user credentials.
 * @route   DELETE /api/v1/notifications/clear-all
 * @access  Private
 */
const clearAll = catchAsync(async (req, res) => {
  await notificationService.clearAllUserNotifications(req.user._id);
  res.status(200).json({ message: "All notifications cleared" });
});

module.exports = {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  clearAll,
};
