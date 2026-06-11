/**
 * @fileoverview User Real-time Alerts and Notifications Systems Configuration Routing Framework
 * @prefix       /api/v1/notifications
 * @access       Private (Authenticated Dashboard Identity Records Context Only)
 */
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  clearAll,
} = require("../controllers/notification.controller");

// Establish global pipeline authentication rules context monitoring parameter boundaries
router.use(authenticate);

// @route   GET /api/v1/notifications
router.get("/", getNotifications);

// @route   PATCH /api/v1/notifications/mark-all-read
router.patch("/mark-all-read", markAllRead);

// @route   PATCH /api/v1/notifications/:id/read
router.patch("/:id/read", markOneRead);

// @route   DELETE /api/v1/notifications/clear-all
router.delete("/clear-all", clearAll);

// @route   DELETE /api/v1/notifications/:id
router.delete("/:id", deleteNotification);

module.exports = router;
