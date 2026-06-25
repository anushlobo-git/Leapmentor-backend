/**
 * @fileoverview Goals and Milestones Tracking Routes
 * @description Configures pipeline routes mounting celebrate schema gates directly.
 */

const express = require("express");

const createGoalRoutes = (goalController, authenticate, validations) => {
  const router = express.Router();
  const {
    createGoalValidation,
    getGoalValidation,
    updateGoalValidation,
    createMilestoneValidation,
    milestoneIdParamValidation,
    updateMilestoneValidation,
  } = validations;

  router.use(authenticate);

  // --- Master Objectives Mappings ---
  router.post("/", createGoalValidation, goalController.createGoal);
  router.get("/:connectRequestId", getGoalValidation, goalController.getGoal);
  router.patch("/:goalId", updateGoalValidation, goalController.updateGoal);

  // --- Incremental Checkpoints Mappings ---
  router.post(
    "/:goalId/milestones",
    createMilestoneValidation,
    goalController.createMilestone,
  );
  router.patch(
    "/milestones/:milestoneId",
    updateMilestoneValidation,
    goalController.updateMilestone,
  );
  router.delete(
    "/milestones/:milestoneId",
    milestoneIdParamValidation,
    goalController.deleteMilestone,
  );

  return router;
};

module.exports = createGoalRoutes;
