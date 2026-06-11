/**
 * @fileoverview Feedback Routes
 * @description  Handles peer evaluations and performance review submissions for completed session blocks.
 * @prefix       /api/v1/feedback
 * @access       Private (User)
 */

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  createFeedback,
  getFeedback,
} = require("../controllers/feedback.controller");

// @route   POST /api/v1/feedback
router.post("/", authenticate, createFeedback);

// @route   GET /api/v1/feedback/:connectRequestId
router.get("/:connectRequestId", authenticate, getFeedback);

module.exports = router;
