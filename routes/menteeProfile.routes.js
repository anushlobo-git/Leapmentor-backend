/**
 * @fileoverview Mentee Profiles Customizations Routes
 * @description  Configures onboarding profile parameter generations, records validation, updates, and public displays.
 * @prefix       /api/v1/mentee-profile
 * @access       Public / Private (Mentee Only)
 */

const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/authenticate");
const {
  createProfile,
  getMyProfile,
  updateProfile,
  getPublicProfile,
} = require("../controllers/menteeProfile.controller");

// --- PROTECTED MENTEE LIFECYCLE MANAGEMENT PIPELINES (Static Routes First) ---

// @route   GET /api/v1/mentee-profile/me
// Explicitly protected static path evaluated before wildcards
router.get("/me", authenticate, requireRole("mentee"), getMyProfile);

// @route   PUT /api/v1/mentee-profile/me
// Explicitly protected static path evaluated before wildcards
router.put("/me", authenticate, requireRole("mentee"), updateProfile);

// @route   POST /api/v1/mentee-profile
router.post("/", authenticate, requireRole("mentee"), createProfile);

// --- PUBLIC READ ONLY VIEWS CHANNELS (Wildcard Routes Last) ---

// @route   GET /api/v1/mentee-profile/:id
// Dynamic catch-all parameter moved to the bottom
router.get("/:id", getPublicProfile);

module.exports = router;
