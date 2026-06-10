/**
 * @fileoverview Connection Request Routes
 * @description  Orchestrates structural configurations, cancellation loops, status updates,
 * and mentor referrals for mentorship connection engagements.
 * @prefix       /api/v1/connect-requests
 * @access       Private (User / Mentor)
 */

const express = require("express");
const router = express.Router();
const {
  sendConnectRequest,
  getMyRequests,
  getIncomingRequests,
  respondToRequest,
  cancelRequest,
  referRequest,
  getOngoingConnects,
  getConnectDetail,
} = require("../controllers/connectRequest.controller");
const { getSimilarMentors } = require("../controllers/mentorRefer.controller");
const { authenticate, requireRole } = require("../middleware/authenticate");

// ── MENTEE ENDPOINTS ──────────────────────────────────────────

// @route   POST /api/v1/connect-requests
router.post("/", authenticate, sendConnectRequest);

// @route   GET /api/v1/connect-requests/my-requests
router.get("/my-requests", authenticate, getMyRequests);

// @route   DELETE /api/v1/connect-requests/:id
router.delete("/:id", authenticate, cancelRequest);

// ── MENTOR ENDPOINTS ──────────────────────────────────────────

// @route   GET /api/v1/connect-requests/incoming
router.get("/incoming", authenticate, getIncomingRequests);

// ── SPECIFIC ROUTE MATCHES (Must execute before generic /:id) ──

// @route   GET /api/v1/connect-requests/:id/similar-mentors
router.get(
  "/:id/similar-mentors",
  authenticate,
  requireRole("mentor"),
  getSimilarMentors,
);

// @route   PATCH /api/v1/connect-requests/:id/refer
router.patch("/:id/refer", authenticate, requireRole("mentor"), referRequest);

// @route   GET /api/v1/connect-requests/:id/detail
router.get("/:id/detail", authenticate, getConnectDetail);

// @route   GET /api/v1/connect-requests/ongoing
router.get("/ongoing", authenticate, getOngoingConnects);

// ── GENERIC FALLBACK ENDPOINTS ────────────────────────────────

// @route   PATCH /api/v1/connect-requests/:id
router.patch("/:id", authenticate, respondToRequest);

module.exports = router;
