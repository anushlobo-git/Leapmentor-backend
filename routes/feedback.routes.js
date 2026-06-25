/**
 * @fileoverview Peer Feedback Collection Router Profiles
 * @description Maps private interaction pathways securing evaluation inputs via injection.
 */

const express = require("express");

const createFeedbackRoutes = (
  feedbackController,
  authenticate,
  validations,
) => {
  const router = express.Router();
  const { createFeedbackValidation, getFeedbackValidation } = validations;

  // Enforce global credentials protection access across endpoints
  router.use(authenticate);

  // @route   POST /api/v1/feedback
  router.post("/", createFeedbackValidation, feedbackController.createFeedback);

  // @route   GET /api/v1/feedback/:connectRequestId
  router.get(
    "/:connectRequestId",
    getFeedbackValidation,
    feedbackController.getFeedback,
  );

  return router;
};

module.exports = createFeedbackRoutes;
