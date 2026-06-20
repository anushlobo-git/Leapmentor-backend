/**
 * @fileoverview Notification Business Logic Service
 * @description Manages message lifecycle operations, handles user contexts, and updates read indices.
 */
const AppError = require("../utils/AppError");
const notificationRepository = require("../repositories/notification.repository");
const { toNotificationDTO } = require("../mappers/notification.mapper");

// Upper-case Domain Architecture Constants
const NOTIFICATION_RETRIEVAL_LIMIT = 50;

/**
 * Resolves history records allocated down to individual target recipients.
 * @description Eliminates slow, heavy diagnostic global scans to maximize pipeline execution performance.
 * @param {string} recipientId - Requesting account validation identity context tracking.
 * @returns {Promise<Array<Object>>} Filtered list tracking tailored historical alerts.
 */
const getRecipientNotifications = async (recipientId) => {
  const notifications = await notificationRepository.findByRecipientLimit(
    recipientId,
    NOTIFICATION_RETRIEVAL_LIMIT,
  );
  
  // Format individual notification payload configurations uniformly
  return notifications.map(toNotificationDTO);
};

/**
 * Switches global outstanding alert pools to read status.
 * @param {string} recipientId - Requesting account validation identity context tracking.
 */
const markAllNotificationsAsRead = async (recipientId) => {
  await notificationRepository.updateManyReadStatus(recipientId, false, true);
};

/**
 * Sets an isolated target alert record status to read.
 * @param {string} notificationId - Unique identity tracking targeted alerts entries.
 * @param {string} recipientId - Requesting account validation identity context tracking.
 * @throws {AppError} 404 - If the targeted alert document index reference is missing.
 */
const markOneNotificationAsRead = async (notificationId, recipientId) => {
  const updatedNotification =
    await notificationRepository.findOneAndUpdateByRecipient(
      notificationId,
      recipientId,
      { read: true },
    );

  if (!updatedNotification) {
    throw new AppError(
      "Target notification metadata point not found or authorization restriction matching record failed",
      404,
    );
  }
};

/**
 * Hard deletes a selected notification resource reference context.
 * @param {string} notificationId - Unique identity tracking targeted alerts entries.
 * @param {string} recipientId - Requesting account validation identity context tracking.
 * @throws {AppError} 404 - If document metrics parameters targets empty records arrays.
 */
const removeNotificationRecord = async (notificationId, recipientId) => {
  const deletedNotification = await notificationRepository.deleteOneByRecipient(
    notificationId,
    recipientId,
  );

  if (!deletedNotification) {
    throw new AppError(
      "Action failed: Target alert parameters match non-existent index locations",
      404,
    );
  }
};

/**
 * Wipes out all historical alerts tracked under the requesting client identity frame.
 * @param {string} recipientId - Requesting account validation identity context tracking.
 */
const clearAllUserNotifications = async (recipientId) => {
  await notificationRepository.deleteManyByRecipient(recipientId);
};

module.exports = {
  getRecipientNotifications,
  markAllNotificationsAsRead,
  markOneNotificationAsRead,
  removeNotificationRecord,
  clearAllUserNotifications,
};
