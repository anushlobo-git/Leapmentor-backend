// optimal/utils/createNotification.js
const Notification = require("../models/Notification");

const createNotification = async ({ recipient, type, title, message, metadata = {} }) => {
  try {
    console.log("🔔 createNotification called:", { recipient, type, title });
    const notif = await Notification.create({ recipient, type, title, message, metadata });
    console.log("✅ Notification saved to DB:", notif._id);
  } catch (err) {
    console.error("❌ Failed to create notification:", err.message);
    console.error("❌ Full error:", err); // ✅ shows full validation error
  }
};

module.exports = createNotification;