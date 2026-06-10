/**
 * @fileoverview Mentor Availability Configuration and Slot Query Routes
 * @description  Orchestrates structural endpoints for managing recurring mentor schedules,
 * administrative day-overrides, transaction slot locking, and public timeline lookups.
 * @prefix       /api/v1/availability
 * @access       Public / Private (User / Mentor)
 */

const express = require("express");
const router = express.Router();
const {
  getMyAvailability,
  createAvailability,
  updateAvailability,
  getMentorAvailability,
  deleteAvailability,
  getAvailableSlots,
} = require("../controllers/availability.controller");
const { authenticate } = require("../middleware/authenticate");

// ── AUTHENTICATED MENTOR OPERATIONS ──────────────────────────

// @route   GET /api/v1/availability/me
router.get("/me", authenticate, getMyAvailability);

// @route   POST /api/v1/availability
router.post("/", authenticate, createAvailability);

// @route   PATCH /api/v1/availability/me
router.patch("/me", authenticate, updateAvailability);

// @route   DELETE /api/v1/availability/me
router.delete("/me", authenticate, deleteAvailability);

// ── SCHEDULING & BOOKING UTILITIES ───────────────────────────

/**
 * Generate a timeline of open, calculable appointment slots for a targeted mentor.
 * @route   GET /api/v1/availability/:mentorId/slots
 * @access  Private (User)
 */
router.get("/:mentorId/slots", authenticate, getAvailableSlots);

/**
 * Fetch base constraints and structural scheduling properties for a specific mentor profile.
 * @route   GET /api/v1/availability/:mentorId
 * @access  Public
 */
router.get("/:mentorId", getMentorAvailability);

module.exports = router;
