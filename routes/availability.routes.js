/**
 * @fileoverview Mentor Availability Configuration and Slot Query Routes
 * @description Orchestrates structural endpoints for managing recurring mentor schedules,
 * administrative day-overrides, transaction slot locking, and public timeline lookups via injection.
 */

const express = require("express");

const createAvailabilityRoutes = (availabilityController, authenticate) => {
  const router = express.Router();

  // ── AUTHENTICATED MENTOR OPERATIONS ──────────────────────────

  // @route   GET /api/v1/availability/me
  router.get("/me", authenticate, availabilityController.getMyAvailability);

  // @route   POST /api/v1/availability
  router.post("/", authenticate, availabilityController.createAvailability);

  // @route   PATCH /api/v1/availability/me
  router.patch("/me", authenticate, availabilityController.updateAvailability);

  // @route   DELETE /api/v1/availability/me
  router.delete("/me", authenticate, availabilityController.deleteAvailability);

  // ── SCHEDULING & BOOKING UTILITIES ───────────────────────────

  // @route   GET /api/v1/availability/:mentorId/slots
  router.get(
    "/:mentorId/slots",
    authenticate,
    availabilityController.getAvailableSlots,
  );

  // @route   GET /api/v1/availability/:mentorId
  router.get("/:mentorId", availabilityController.getMentorAvailability);

  return router;
};

module.exports = createAvailabilityRoutes;
