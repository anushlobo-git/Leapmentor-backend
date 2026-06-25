/**
 * @fileoverview Goal and Milestone Domain Controller
 * @description Structural abstraction passing structural parameters arrays straight into core application engines.
 */

const catchAsync = require("../utils/catchAsync");

const createGoalController = (goalService) => {
  const createGoal = catchAsync(async (req, res, next) => {
    const goal = await goalService.createGoal({
      connectRequestId: req.body.connectRequestId,
      title: req.body.title,
      description: req.body.description,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      userId: req.user._id,
    });
    return res.status(201).json({ success: true, goal });
  });

  const getGoal = catchAsync(async (req, res, next) => {
    const result = await goalService.getGoalByConnection(
      req.params.connectRequestId,
      req.user._id,
    );
    return res.status(200).json({ success: true, ...result });
  });

  const updateGoal = catchAsync(async (req, res, next) => {
    const goal = await goalService.updateGoal({
      goalId: req.params.goalId,
      title: req.body.title,
      description: req.body.description,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status,
      userId: req.user._id,
    });
    return res.status(200).json({ success: true, goal });
  });

  const createMilestone = catchAsync(async (req, res, next) => {
    const milestone = await goalService.createMilestone({
      goalId: req.params.goalId,
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      userId: req.user._id,
    });
    return res.status(201).json({ success: true, milestone });
  });

  const updateMilestone = catchAsync(async (req, res, next) => {
    const milestone = await goalService.updateMilestone({
      milestoneId: req.params.milestoneId,
      title: req.body.title,
      description: req.body.description,
      isCompleted: req.body.isCompleted,
      userId: req.user._id,
    });
    return res.status(200).json({ success: true, milestone });
  });

  const deleteMilestone = catchAsync(async (req, res, next) => {
    const milestoneId = await goalService.deleteMilestone(
      req.params.milestoneId,
      req.user._id,
    );
    return res
      .status(200)
      .json({ success: true, message: "Milestone deleted", milestoneId });
  });

  return {
    createGoal,
    getGoal,
    updateGoal,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  };
};

module.exports = createGoalController;
