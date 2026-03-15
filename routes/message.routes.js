// backend/routes/message.routes.js
const express = require("express");
const router  = express.Router();
const { authenticate } = require("../middleware/authenticate");
const { getMessages, getUnreadCount } = require("../controllers/message.controller");

// GET /api/messages/:connectRequestId         — paginated history
router.get("/:connectRequestId",              authenticate, getMessages);

// GET /api/messages/:connectRequestId/unread  — unread count
router.get("/:connectRequestId/unread",       authenticate, getUnreadCount);

module.exports = router;