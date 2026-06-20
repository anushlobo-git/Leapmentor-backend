/**
 * @fileoverview Mentor Profiles Customizations Routes
 * @description  Configures onboarding profile parameter generations, records validation, updates, and public displays.
 * @prefix       /api/v1/mentor-profile
 * @access       Public / Private (Mentor Only)
 */

const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  createProfile,
  getMyProfile,
  updateProfile,
  getPublicProfile,
} = require("../controllers/mentorProfile.controller");

// --- PROTECTED MENTOR LIFECYCLE MANAGEMENT PIPELINES (Static Routes First) ---

// @route   GET /api/v1/mentor-profile/me
// Protected static path evaluated before wildcards
router.get("/me", authenticate, requireRole("mentor"), getMyProfile);

// @route   PUT /api/v1/mentor-profile/me
// Protected static path evaluated before wildcards
router.put("/me", authenticate, requireRole("mentor"), updateProfile);

// @route   POST /api/v1/mentor-profile
// Protected creation path
router.post("/", authenticate, requireRole("mentor"), createProfile);

// --- PUBLIC READ ONLY VIEWS CHANNELS (Wildcard Routes Last) ---

// @route   GET /api/v1/mentor-profile/:id
// Dynamic catch-all parameter moved safely to the bottom
router.get("/:id", getPublicProfile);

module.exports = router;
