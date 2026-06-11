/**
 * @fileoverview Session Workflow Routes
 * @description  Handles workspace links, milestone completions, cancellations, reschedules, and live vacancy synchronization.
 * @prefix       /api/v1/sessions
 * @access       Private (Authenticated Users)
 */

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  getSlots,
  setMeetingLink,
  markSlotComplete,
  addSlot,
  cancelSlot,
  rescheduleSlot,
  getMentorAvailability,
} = require("../controllers/session.controller");

// All endpoints require a verified identity token
router.use(authenticate);

// @route   GET /api/v1/sessions/:connectRequestId/slots
router.get("/:connectRequestId/slots", getSlots);

// @route   GET /api/v1/sessions/:connectRequestId/mentor-availability
router.get("/:connectRequestId/mentor-availability", getMentorAvailability);

// @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/meeting-link
router.patch(
  "/:connectRequestId/slots/:slotIndex/meeting-link",
  setMeetingLink,
);

// @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/mark-complete
router.patch(
  "/:connectRequestId/slots/:slotIndex/mark-complete",
  markSlotComplete,
);

// @route   POST /api/v1/sessions/:connectRequestId/add-slot
router.post("/:connectRequestId/add-slot", addSlot);

// @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/cancel
router.patch("/:connectRequestId/slots/:slotIndex/cancel", cancelSlot);

// @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/reschedule
router.patch("/:connectRequestId/slots/:slotIndex/reschedule", rescheduleSlot);

module.exports = router;
