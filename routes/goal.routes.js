/**
 * @fileoverview Goals and Milestones Tracking Routes
 * @description  Handles structural milestone roadmaps, targets creation pipelines, states revisions, and real-time completions.
 * @prefix       /api/v1/goals
 * @access       Private (Authenticated Users)
 */

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  createGoal,
  getGoal,
  updateGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} = require("../controllers/goal.controller");

// All goals and milestones endpoint triggers require a verified identity token lock
router.use(authenticate);

// --- Master Objectives Mappings ---
// @route   POST /api/v1/goals
router.post("/", createGoal);

// @route   GET /api/v1/goals/:connectRequestId
router.get("/:connectRequestId", getGoal);

// @route   PATCH /api/v1/goals/:goalId
router.patch("/:goalId", updateGoal);

// --- Incremental Checkpoints Mappings ---
// @route   POST /api/v1/goals/:goalId/milestones
router.post("/:goalId/milestones", createMilestone);

// @route   PATCH /api/v1/goals/milestones/:milestoneId
router.patch("/milestones/:milestoneId", updateMilestone);

// @route   DELETE /api/v1/goals/milestones/:milestoneId
router.delete("/milestones/:milestoneId", deleteMilestone);

module.exports = router;
