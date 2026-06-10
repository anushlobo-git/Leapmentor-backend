const logger = require("../config/logger");
const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  metadata = {},
}) => {
  try {
    const notif = await Notification.create({
      recipient,
      type,
      title,
      message,
      metadata,
    });
    logger.info("Notification created", {
      notificationId: notif._id,
      recipient,
      type,
    });
  } catch (err) {
    logger.error("Failed to create notification", {
      error: err.message,
      stack: err.stack,
      recipient,
      type,
      title,
    });
  }
};

module.exports = createNotification;
