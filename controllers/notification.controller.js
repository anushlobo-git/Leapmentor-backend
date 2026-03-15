// optimal/controllers/notification.controller.js
const Notification = require("../models/Notification");

// GET /api/notifications — get all notifications for logged-in user
const getNotifications = async (req, res) => {
  try {
    console.log("🔍 Getting notifications for user ID:", req.user._id.toString());
    const all = await Notification.find({});
    console.log("🔍 Total notifications in DB:", all.length);
    console.log("🔍 All recipient IDs in DB:", all.map(n => n.recipient.toString()));

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    console.log("🔍 Matched notifications for this user:", notifications.length);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// PATCH /api/notifications/mark-all-read
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

// PATCH /api/notifications/:id/read
const markOneRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true }
    );
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

// DELETE /api/notifications/clear-all
const clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear notifications" });
  }
};

module.exports = {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  clearAll,
}; 