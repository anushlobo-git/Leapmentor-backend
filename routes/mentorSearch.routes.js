/**
 * @fileoverview Mentor Discovery and Discovery Analytics Search Routes
 * @prefix       /api/v1/mentors
 * @access       Private (Mentee Only)
 */
const express = require("express");
const router = express.Router();
const {
  searchMentors,
} = require("../controllers/mentorSearch.controller");
const { authenticate, requireRole } = require("../middleware/authenticate");

// Lock all downstream search channels under verified mentee authorizations
router.use(authenticate, requireRole("mentee"));

// @route   GET /api/v1/mentors/search
router.get("/search", searchMentors);


module.exports = router;
