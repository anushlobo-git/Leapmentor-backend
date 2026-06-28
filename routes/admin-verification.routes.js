/**
 * @fileoverview Admin Mentor Verification Routes
 * @description Handles administrative auditing workflows and status transitions for mentor profiles.
 */

const express = require("express");
const {
  mentorProfileIdParamValidation,
} = require("../validations/admin-verification.validation");

const createAdminVerificationRoutes = ({ adminVerificationController, adminAuthenticate }) => {
  const router = express.Router();

  // Protect all verification gateways with administrative session authentication
  router.use(adminAuthenticate);

  // ── AUDITING & RETRIEVAL ENDPOINTS ───────────────────────────
  // @route   GET /api/v1/admin/mentor-verifications
  router.get("/", adminVerificationController.getAllMentorVerifications);

  // @route   GET /api/v1/admin/mentor-verifications/:mentorProfileId
  router.get(
    "/:mentorProfileId",
    mentorProfileIdParamValidation,
    adminVerificationController.getMentorVerificationById,
  );

  // ── VERIFICATION STATUS MANAGEMENT ───────────────────────────
  // @route   PATCH /api/v1/admin/mentor-verifications/:mentorProfileId/verify
  router.patch(
    "/:mentorProfileId/verify",
    mentorProfileIdParamValidation,
    adminVerificationController.verifyMentor,
  );

  // @route   PATCH /api/v1/admin/mentor-verifications/:mentorProfileId/revoke
  router.patch(
    "/:mentorProfileId/revoke",
    mentorProfileIdParamValidation,
    adminVerificationController.revokeMentorVerification,
  );

  return router;
};

module.exports = createAdminVerificationRoutes;
