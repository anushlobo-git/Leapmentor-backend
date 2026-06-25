/**
 * @fileoverview Notification Repository
 * @description Inverted data accessor module mapping operations to the Notification model.
 */

const createNotificationRepository = (Notification) => {
  const findByRecipientLimit = (recipientId, limit) => {
    return Notification.find({ recipient: recipientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  };

  const updateManyReadStatus = (
    recipientId,
    currentReadStatus,
    newReadStatus,
  ) => {
    return Notification.updateMany(
      { recipient: recipientId, read: currentReadStatus },
      { $set: { read: newReadStatus } },
    );
  };

  const findOneAndUpdateByRecipient = (
    notificationId,
    recipientId,
    updateData,
  ) => {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipient: recipientId },
      { $set: updateData },
      { new: true },
    ).lean();
  };

  const deleteOneByRecipient = (notificationId, recipientId) => {
    return Notification.findOneAndDelete({
      _id: notificationId,
      recipient: recipientId,
    });
  };

  const deleteManyByRecipient = (recipientId) => {
    return Notification.deleteMany({ recipient: recipientId });
  };

  const createNotification = (notificationData) => {
    return Notification.create(notificationData);
  };

  return {
    findByRecipientLimit,
    updateManyReadStatus,
    findOneAndUpdateByRecipient,
    deleteOneByRecipient,
    deleteManyByRecipient,
    createNotification,
  };
};

module.exports = createNotificationRepository;
