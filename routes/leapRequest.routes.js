/**
 * @fileoverview Leap Request Lifecycle Routes
 * @description  Configures user request pipeline points submissions and administrator verification authorization triggers.
 * @prefix       /api/v1/leap-requests
 * @access       Private (User / Admin Only)
 */

const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/authenticate");
const { adminAuthenticate } = require("../middleware/adminAuth");
const {
  getMyRequest,
  createRequest,
  getAllRequests,
  getPendingCount,
  approveRequest,
  rejectRequest,
} = require("../controllers/leapRequest.controller");

// --- MENTEE OPERATION CHANNELS ---

// @route   GET /api/v1/leap-requests/my-request
router.get("/my-request", authenticate, getMyRequest);

// @route   POST /api/v1/leap-requests
router.post("/", authenticate, createRequest);

// --- ADMINISTRATIVE REVIEW PIPELINES ---
router.use(adminAuthenticate);

// @route   GET /api/v1/leap-requests
router.get("/", getAllRequests);

// @route   GET /api/v1/leap-requests/pending-count
router.get("/pending-count", getPendingCount);

// @route   PATCH /api/v1/leap-requests/:id/approve
router.patch("/:id/approve", approveRequest);

// @route   PATCH /api/v1/leap-requests/:id/reject
router.patch("/:id/reject", rejectRequest);

module.exports = router;
