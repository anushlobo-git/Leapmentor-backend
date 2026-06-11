/**
 * @fileoverview HelpCenter Ingestion & Administrative Ticket Management Routes Framework
 * @prefix       /api/v1/support
 * @access       Public / Private (Admin Only)
 */
const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessages,
  resolveMessage,
} = require("../controllers/support.controller");
const { adminAuthenticate } = require("../middleware/adminAuth");

// --- PUBLIC INGESTION ENDPOINTS (ACCESSIBLE OUT-OF-BAND FROM HELP CENTER SUBMISSIONS) ---
// @route   POST /api/v1/support/messages
router.post("/messages", createMessage);

// --- SECURED MANAGEMENT SEGMENTS (RESTRICTED TO VERIFIED ADMINISTRATOR SECURITY REALMS) ---
router.use("/messages", adminAuthenticate);

// @route   GET /api/v1/support/messages
router.get("/messages", getMessages);

// @route   PATCH /api/v1/support/messages/:id/resolve
router.patch("/messages/:id/resolve", resolveMessage);

module.exports = router;
