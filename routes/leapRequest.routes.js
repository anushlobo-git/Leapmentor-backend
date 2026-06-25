/**
 * @fileoverview Leap Request Lifecycle Routes
 * @description Configures user request pipeline points submissions and administrator verification authorization triggers.
 * Completely decoupled from concrete implementations via parameter injection and protected by Celebrate validations.
 */

const express = require("express");

const {
  getAllLeapRequestsQueryValidation,
  leapRequestIdParamValidation,
} = require("../validations/leapRequest.validation");

const createLeapRequestRoutes = (
  leapRequestController,
  authenticate,
  adminAuthenticate,
) => {
  const router = express.Router();

  // --- MENTEE OPERATION CHANNELS ---

  // @route   GET /api/v1/leap-requests/my-request
  router.get("/my-request", authenticate, leapRequestController.getMyRequest);

  // @route   POST /api/v1/leap-requests
  router.post("/", authenticate, leapRequestController.createRequest);

  // --- ADMINISTRATIVE REVIEW PIPELINES ---
  router.use(adminAuthenticate);

  // @route   GET /api/v1/leap-requests
  router.get(
    "/",
    getAllLeapRequestsQueryValidation,
    leapRequestController.getAllRequests,
  );

  // @route   GET /api/v1/leap-requests/pending-count
  router.get("/pending-count", leapRequestController.getPendingCount);

  // @route   PATCH /api/v1/leap-requests/:id/approve
  router.patch(
    "/:id/approve",
    leapRequestIdParamValidation,
    leapRequestController.approveRequest,
  );

  // @route   PATCH /api/v1/leap-requests/:id/reject
  router.patch(
    "/:id/reject",
    leapRequestIdParamValidation,
    leapRequestController.rejectRequest,
  );

  return router;
};

module.exports = createLeapRequestRoutes;
