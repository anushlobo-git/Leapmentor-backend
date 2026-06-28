/**
 * @fileoverview Mentor Profiles Customizations Routes
 * @description Configures onboarding profile parameter generations, records validation, updates, and public displays via injection.
 */

const express = require("express");

const createMentorProfileRoutes = ({ mentorProfileController, middlewares, validations }) => {
  const router = express.Router();
  const { authenticate, requireRole } = middlewares;
  const {
    createProfileValidation,
    updateProfileValidation,
    mentorIdParamValidation,
  } = validations;

  // --- PROTECTED MENTOR LIFECYCLE MANAGEMENT PIPELINES (Static Routes First) ---
  router.get(
    "/me",
    authenticate,
    requireRole("mentor"),
    mentorProfileController.getMyProfile,
  );
  router.put(
    "/me",
    authenticate,
    requireRole("mentor"),
    updateProfileValidation,
    mentorProfileController.updateProfile,
  );
  router.post(
    "/",
    authenticate,
    requireRole("mentor"),
    createProfileValidation,
    mentorProfileController.createProfile,
  );

  // --- PUBLIC READ ONLY VIEWS CHANNELS (Wildcard Routes Last) ---
  router.get(
    "/:id",
    mentorIdParamValidation,
    mentorProfileController.getPublicProfile,
  );

  return router;
};

module.exports = createMentorProfileRoutes;
