const express          = require("express");
const router           = express.Router();
const { authenticate } = require("../middleware/authenticate");

const controllers = require("../controllers/goal.controller"); // ✅ assign first

const {
  createGoal,
  getGoal,
  updateGoal,
  addMilestone,
  updateMilestone,
  deleteMilestone,
} = controllers;

// Goal routes
router.post(  "/",                        authenticate, createGoal);
router.get(   "/:connectRequestId",       authenticate, getGoal);
router.patch( "/:goalId",                 authenticate, updateGoal);

// Milestone routes
router.post(  "/:goalId/milestones",      authenticate, addMilestone);
router.patch( "/milestones/:milestoneId", authenticate, updateMilestone);
router.delete("/milestones/:milestoneId", authenticate, deleteMilestone);

module.exports = router;

