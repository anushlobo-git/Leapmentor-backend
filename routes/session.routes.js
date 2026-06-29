/**
 * @fileoverview Session Workflow Routes
 * @description Orchestrates Express routing arrays binding schema validation masks directly onto processing pipelines.
 */

const express = require("express");

const createSessionRoutes = ({ sessionController, authenticate, validations }) => {
  const router = express.Router();

  const {
    getSlotsValidation,
    setMeetingLinkValidation,
    slotIndexParamValidation,
    addSlotValidation,
    cancelSlotValidation,
    rescheduleSlotValidation,
    getMentorAvailabilityValidation,
  } = validations;

  // Enforce mandatory security passport parameters across all endpoints
  router.use(authenticate);

  // @route   GET /api/v1/sessions/:connectRequestId/slots
  router.get(
    "/:connectRequestId/slots",
    getSlotsValidation,
    sessionController.getSlots,
  );

  // @route   GET /api/v1/sessions/:connectRequestId/mentor-availability
  router.get(
    "/:connectRequestId/mentor-availability",
    getMentorAvailabilityValidation,
    sessionController.getMentorAvailability,
  );

  // @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/meeting-link
  router.patch(
    "/:connectRequestId/slots/:slotIndex/meeting-link",
    setMeetingLinkValidation,
    sessionController.setMeetingLink,
  );

  // @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/mark-complete
  router.patch(
    "/:connectRequestId/slots/:slotIndex/mark-complete",
    slotIndexParamValidation,
    sessionController.markSlotComplete,
  );

  // @route   POST /api/v1/sessions/:connectRequestId/add-slot
  router.post(
    "/:connectRequestId/add-slot",
    addSlotValidation,
    sessionController.addSlot,
  );

  // @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/cancel
  router.patch(
    "/:connectRequestId/slots/:slotIndex/cancel",
    cancelSlotValidation,
    sessionController.cancelSlot,
  );

  // @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/reschedule
  router.patch(
    "/:connectRequestId/slots/:slotIndex/reschedule",
    rescheduleSlotValidation,
    sessionController.rescheduleSlot,
  );

  return router;
};

module.exports = createSessionRoutes;
