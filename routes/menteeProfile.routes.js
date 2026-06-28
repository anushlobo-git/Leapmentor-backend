/**
 * @fileoverview Mentee Profiles Customizations Routes
 * @description Configures pipeline routes mounting celebrate validation schemas directly via injection.
 */

const express = require("express");

const createMenteeProfileRoutes = ({ menteeProfileController, middlewares, validations }) => {
  const router = express.Router();
  const { authenticate, requireRole } = middlewares;
  const {
    createProfileValidation,
    updateProfileValidation,
    menteeIdParamValidation,
  } = validations;

  // --- PROTECTED MENTEE LIFECYCLE PIPELINES (Static Routes First) ---
  router.get(
    "/me",
    authenticate,
    requireRole("mentee"),
    menteeProfileController.getMyProfile,
  );
  router.put(
    "/me",
    authenticate,
    requireRole("mentee"),
    updateProfileValidation,
    menteeProfileController.updateProfile,
  );
  router.post(
    "/",
    authenticate,
    requireRole("mentee"),
    createProfileValidation,
    menteeProfileController.createProfile,
  );

  // --- PUBLIC READ ONLY VIEWS CHANNELS (Wildcard Routes Last) ---
  router.get(
    "/:id",
    menteeIdParamValidation,
    menteeProfileController.getPublicProfile,
  );

  return router;
};

module.exports = createMenteeProfileRoutes;
