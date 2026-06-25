/**
 * @fileoverview Peer Feedback Interface Controller
 * @description Thin network boundary processing inbound score submittals and matching lookup lookups.
 */

const catchAsync = require("../utils/catchAsync");

const createFeedbackController = (feedbackService) => {
  /**
   * Submit an assessment payload for an individual completed conversation sequence.
   * @route POST /api/v1/feedback
   */
  const createFeedback = catchAsync(async (req, res, next) => {
    const result = await feedbackService.createFeedback({
      connectRequestId: req.body.connectRequestId,
      rating: req.body.rating,
      comment: req.body.comment,
      slotIndex: req.body.slotIndex,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      feedback: result,
    });
  });

  /**
   * Extract historical assessment payload files corresponding to a distinct contract string ID.
   * @route GET /api/v1/feedback/:connectRequestId
   */
  const getFeedback = catchAsync(async (req, res, next) => {
    const result = await feedbackService.getFeedback(
      req.params.connectRequestId,
      req.user._id,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  });

  return {
    createFeedback,
    getFeedback,
  };
};

module.exports = createFeedbackController;
