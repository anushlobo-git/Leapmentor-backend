/**
 * @fileoverview Goal and Milestone Domain Controller
 * @description Extracts parameters and payloads from entry triggers, passing data downstream directly to the service logic layer.
 */
const catchAsync = require("../utils/catchAsync");
const goalService = require("../services/goal.service");

/**
 * Establishes a brand new outcome objective matrix targeting an ongoing connection framework.
 * @route   POST /api/v1/goals
 * @access  Private (User)
 */
const createGoal = catchAsync(async (req, res) => {
  const goal = await goalService.createGoal({
    connectRequestId: req.body.connectRequestId,
    title: req.body.title,
    description: req.body.description,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    userId: req.user._id,
  });

  res.status(201).json({ success: true, goal });
});

/**
 * Returns complete roadmap objective states mapped against targeting parent connection keys.
 * @route   GET /api/v1/goals/:connectRequestId
 * @access  Private (User)
 */
const getGoal = catchAsync(async (req, res) => {
  const result = await goalService.getGoalByConnection(
    req.params.connectRequestId,
    req.user._id,
  );

  res.status(200).json({ success: true, ...result });
});

/**
 * Modifies specific tracking criteria metrics configuring target outcome master objective parameters.
 * @route   PATCH /api/v1/goals/:goalId
 * @access  Private (User)
 */
const updateGoal = catchAsync(async (req, res) => {
  const goal = await goalService.updateGoal({
    goalId: req.params.goalId,
    title: req.body.title,
    description: req.body.description,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    status: req.body.status,
    userId: req.user._id,
  });

  res.status(200).json({ success: true, goal });
});

/**
 * Appends custom progress checkpoint configurations down inside targeting master outcome blocks.
 * @route   POST /api/v1/goals/:goalId/milestones
 * @access  Private (User)
 */
const createMilestone = catchAsync(async (req, res) => {
  const milestone = await goalService.createMilestone({
    goalId: req.params.goalId,
    title: req.body.title,
    description: req.body.description,
    dueDate: req.body.dueDate,
    userId: req.user._id,
  });

  res.status(201).json({ success: true, milestone });
});

/**
 * Updates active parameter states managing operational milestone check items status attributes.
 * @route   PATCH /api/v1/goals/milestones/:milestoneId
 * @access  Private (User)
 */
const updateMilestone = catchAsync(async (req, res) => {
  const milestone = await goalService.updateMilestone({
    milestoneId: req.params.milestoneId,
    title: req.body.title,
    description: req.body.description,
    isCompleted: req.body.isCompleted,
    userId: req.user._id,
  });

  res.status(200).json({ success: true, milestone });
});

/**
 * Erases specific incremental milestone sub-records entirely from systemic progress sheets.
 * @route   DELETE /api/v1/goals/milestones/:milestoneId
 * @access  Private (User)
 */
const deleteMilestone = catchAsync(async (req, res) => {
  const milestoneId = await goalService.deleteMilestone(
    req.params.milestoneId,
    req.user._id,
  );

  res
    .status(200)
    .json({ success: true, message: "Milestone deleted", milestoneId });
});

module.exports = {
  createGoal,
  getGoal,
  updateGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
};
