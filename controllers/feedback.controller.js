/**
 * @fileoverview Feedback Domain Controller
 * @description Maps incoming HTTP entry gates, parameters, and payloads down straight into corresponding services.
 */
const catchAsync = require("../utils/catchAsync");
const feedbackService = require("../services/feedback.service");

/**
 * Processes peer assessment metrics submission parameters.
 * @route   POST /api/feedback
 * @access  Private (User)
 */
const createFeedback = catchAsync(async (req, res) => {
  const slotIndex =
    req.body.slotIndex == null ? undefined : Number(req.body.slotIndex);

  const populatedFeedback = await feedbackService.createFeedback({
    connectRequestId: req.body.connectRequestId,
    rating: req.body.rating,
    comment: req.body.comment,
    slotIndex,
    userId: req.user._id,
  });

  res.status(201).json({ success: true, feedback: populatedFeedback });
});

/**
 * Exposes recorded peer descriptions matching the targeting workflow environment.
 * @route   GET /api/feedback/:connectRequestId
 * @access  Private (User)
 */
const getFeedback = catchAsync(async (req, res) => {
  const result = await feedbackService.getFeedback(
    req.params.connectRequestId,
    req.user._id,
  );
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  createFeedback,
  getFeedback,
};
