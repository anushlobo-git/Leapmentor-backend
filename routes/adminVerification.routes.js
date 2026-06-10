/**
 * @fileoverview Admin Mentor Verification Routes
 * @description  Handles the administrative auditing workflow, background identity validation,
 * and credential status changes for mentor profile applications.
 * @prefix       /api/v1/admin/mentor-verifications
 * @access       Private (Admin Only)
 */

const express = require("express");
const router = express.Router();
const {
  getAllMentorVerifications,
  getMentorVerificationById,
  verifyMentor,
  revokeMentorVerification,
} = require("../controllers/adminVerification.controller.js");
const { adminAuthenticate } = require("../middleware/adminAuth.js");

// Protect all verification gateways with administrative session authentication
router.use(adminAuthenticate);

// ── AUDITING & RETRIEVAL ENDPOINTS ───────────────────────────

/**
 * Fetch a comprehensive list of all pending and processed mentor verification applications.
 * @route   GET /api/v1/admin/mentor-verifications
 * @access  Private (Admin Only)
 */
router.get("/", getAllMentorVerifications);

/**
 * Retrieve granular profile data, application credentials, and secure document links for an isolated mentor.
 * @route   GET /api/v1/admin/mentor-verifications/:mentorProfileId
 * @access  Private (Admin Only)
 */
router.get("/:mentorProfileId", getMentorVerificationById);

// ── VERIFICATION STATUS MANAGEMENT ───────────────────────────

/**
 * Approve a mentor's identity application and promote their status to verified.
 * @route   PATCH /api/v1/admin/mentor-verifications/:mentorProfileId/verify
 * @access  Private (Admin Only)
 */
router.patch("/:mentorProfileId/verify", verifyMentor);

/**
 * Strip verified credentials from an active mentor profile and roll their status back to unverified.
 * @route   PATCH /api/v1/admin/mentor-verifications/:mentorProfileId/revoke
 * @access  Private (Admin Only)
 */
router.patch("/:mentorProfileId/revoke", revokeMentorVerification);

module.exports = router;
