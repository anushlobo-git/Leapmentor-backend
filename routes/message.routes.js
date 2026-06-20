/**
 * @fileoverview Real-time Messaging and Chat Streams Configuration Routes
 * @prefix       /api/v1/messages
 * @access       Private (Authenticated Participant Users Only)
 */
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  getMessages,
  getUnreadCount,
} = require("../controllers/message.controller");

// Global pipeline protection firewall across all communication parameters channels endpoints
router.use(authenticate);

// @route   GET /api/v1/messages/:connectRequestId
router.get("/:connectRequestId", getMessages);

// @route   GET /api/v1/messages/:connectRequestId/unread
router.get("/:connectRequestId/unread", getUnreadCount);

module.exports = router;
