/**
 * @fileoverview Mentor Discovery and Discovery Analytics Search Routes
 * @description Secures and routes search traffic mounting declarative schema gate validation rules.
 */

const express = require("express");

const createMentorSearchRoutes = (
  mentorSearchController,
  middlewares,
  validations,
) => {
  const router = express.Router();
  const { authenticate, requireRole } = middlewares;
  const { searchMentorsValidation } = validations;

  // Lock all downstream search channels under verified mentee authorizations
  router.use(authenticate, requireRole("mentee"));

  // @route   GET /api/v1/mentors/search
  router.get(
    "/search",
    searchMentorsValidation,
    mentorSearchController.searchMentors,
  );

  return router;
};

module.exports = createMentorSearchRoutes;
