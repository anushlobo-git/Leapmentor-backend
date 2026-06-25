/**
 * @fileoverview Notification Business Logic Service
 * @description Manages message lifecycle operations, handles user contexts, 
 * and updates read indices via constructor parameter injection.
 */

const AppError = require("../utils/AppError");

const NOTIFICATION_RETRIEVAL_LIMIT = 50;

const createNotificationService = (notificationRepository, toNotificationDTO) => {
  /**
   * Resolves history records allocated down to individual target recipients.
   */
  const getRecipientNotifications = async (recipientId) => {
    const notifications = await notificationRepository.findByRecipientLimit(
      recipientId,
      NOTIFICATION_RETRIEVAL_LIMIT
    );
    return notifications.map(toNotificationDTO);
  };

  /**
   * Switches global outstanding alert pools to read status.
   */
  const markAllNotificationsAsRead = async (recipientId) => {
    await notificationRepository.updateManyReadStatus(recipientId, false, true);
  };

  /**
   * Sets an isolated target alert record status to read.
   */
  const markOneNotificationAsRead = async (notificationId, recipientId) => {
    const updatedNotification = await notificationRepository.findOneAndUpdateByRecipient(
      notificationId,
      recipientId,
      { read: true }
    );

    if (!updatedNotification) {
      throw new AppError(
        "Target notification metadata point not found or authorization restriction matching record failed",
        404
      );
    }
  };

  /**
   * Hard deletes a selected notification resource reference context.
   */
  const removeNotificationRecord = async (notificationId, recipientId) => {
    const deletedNotification = await notificationRepository.deleteOneByRecipient(
      notificationId,
      recipientId
    );

    if (!deletedNotification) {
      throw new AppError(
        "Action failed: Target alert parameters match non-existent index locations",
        404
      );
    }
  };

  /**
   * Wipes out all historical alerts tracked under the requesting client identity frame.
   */
  const clearAllUserNotifications = async (recipientId) => {
    await notificationRepository.deleteManyByRecipient(recipientId);
  };

  return {
    getRecipientNotifications,
    markAllNotificationsAsRead,
    markOneNotificationAsRead,
    removeNotificationRecord,
    clearAllUserNotifications,
  };
};

module.exports = createNotificationService;