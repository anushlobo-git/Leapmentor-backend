/**
 * @fileoverview Notification Repository
 * @description Direct database access layer mapping all operations to the Notification Mongoose model.
 */
const Notification = require("../models/Notification");

/**
 * Retrieves an optimized, limited list of notifications for a specific recipient.
 * @param {string} recipientId - Unique identifier of the target user.
 * @param {number} limit - Maximum number of notification records to return.
 * @returns {Promise<Array<Object>>} Lean array containing notification plain objects.
 */
const findByRecipientLimit = (recipientId, limit) => {
  return Notification.find({ recipient: recipientId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Bulk updates the read state of notification records matching filter criteria.
 * @param {string} recipientId - Unique identifier of the target user.
 * @param {boolean} currentReadStatus - Filter criteria target state flag.
 * @param {boolean} newReadStatus - Modified update target state flag.
 * @returns {Promise<Object>} Mongoose update operation metadata summary.
 */
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

/**
 * Atomic lookup and modification constraint mapping specific notification IDs.
 * @param {string} notificationId - Primary key database reference tracking the document.
 * @param {string} recipientId - Target user ID context boundary tracking.
 * @param {Object} updateData - Set modifiers collection tracking data assignments.
 * @returns {Promise<Object|null>} Mutated database document record tracking parameters or null.
 */
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

/**
 * Removes an isolated notification record verified against owner context.
 * @param {string} notificationId - Primary key database reference tracking the document.
 * @param {string} recipientId - Target user ID context boundary tracking.
 * @returns {Promise<Object|null>} Removed documentation logging mapping details or null.
 */
const deleteOneByRecipient = (notificationId, recipientId) => {
  return Notification.findOneAndDelete({
    _id: notificationId,
    recipient: recipientId,
  });
};

/**
 * Purges the entire notification history for a specific recipient.
 * @param {string} recipientId - Unique identifier of the target user.
 * @returns {Promise<Object>} Mongoose execution deletion summary block metadata.
 */
const deleteManyByRecipient = (recipientId) => {
  return Notification.deleteMany({ recipient: recipientId });
};

/**
 * Persists a new notification record into the notification collection.
 * @param {Object} notificationData - Notification payload containing recipient, type, and message details.
 * @returns {Promise<Object>} Newly created Mongoose notification document.
 */
const createNotification = (notificationData) => {
  return Notification.create(notificationData);
};

module.exports = {
  findByRecipientLimit,
  updateManyReadStatus,
  findOneAndUpdateByRecipient,
  deleteOneByRecipient,
  deleteManyByRecipient,
  createNotification,
};
