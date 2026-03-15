// backend/routes/session.routes.js
const express = require("express");
const router  = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  getSlots,
  setMeetingLink,
  markSlotComplete,
} = require("../controllers/session.controller");

// GET  /api/sessions/:connectRequestId/slots
// Returns all slots with completion status + overall progress
router.get("/:connectRequestId/slots", authenticate, getSlots);

// PATCH /api/sessions/:connectRequestId/slots/:slotIndex/meeting-link
// Mentor or mentee sets meeting link for a specific slot
router.patch("/:connectRequestId/slots/:slotIndex/meeting-link", authenticate, setMeetingLink);

// PATCH /api/sessions/:connectRequestId/slots/:slotIndex/mark-complete
// Mentor or mentee marks a slot complete — auto-releases escrow when all done
router.patch("/:connectRequestId/slots/:slotIndex/mark-complete", authenticate, markSlotComplete);

module.exports = router;