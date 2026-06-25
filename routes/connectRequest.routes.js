/**
 * @fileoverview Connection Request Routes
 * @description Orchestrates structural configurations, cancellation loops, status updates,
 * and mentor referrals for mentorship connection engagements via parameter dependency injection.
 */

const express = require("express");

const createConnectRequestRoutes = (controllers, middlewares, validations) => {
  const router = express.Router();

  const { connectRequestController, mentorReferController } = controllers;
  const { authenticate, requireRole } = middlewares;

  const {
    sendConnectRequestValidation,
    respondToRequestValidation,
    referRequestValidation,
    validateObjectId,
  } = validations;

  // ── MENTEE ENDPOINTS ──────────────────────────────────────────

  // @route   POST /api/v1/connect-requests
  router.post(
    "/",
    authenticate,
    sendConnectRequestValidation,
    connectRequestController.sendConnectRequest,
  );

  // @route   GET /api/v1/connect-requests/my-requests
  router.get(
    "/my-requests",
    authenticate,
    connectRequestController.getMyRequests,
  );

  // ── MENTOR ENDPOINTS ──────────────────────────────────────────

  // @route   GET /api/v1/connect-requests/incoming
  router.get(
    "/incoming",
    authenticate,
    connectRequestController.getIncomingRequests,
  );

  // @route   GET /api/v1/connect-requests/ongoing
  router.get(
    "/ongoing",
    authenticate,
    connectRequestController.getOngoingConnects,
  );

  // ── SPECIFIC ROUTE MATCHES (Must execute before generic /:id) ──

  // @route   GET /api/v1/connect-requests/:id/detail
  router.get(
    "/:id/detail",
    authenticate,
    validateObjectId,
    connectRequestController.getConnectDetail,
  );

  // @route   GET /api/v1/connect-requests/:id/similar-mentors
  router.get(
    "/:id/similar-mentors",
    authenticate,
    requireRole("mentor"),
    validateObjectId,
    mentorReferController.getSimilarMentors,
  );

  // @route   PATCH /api/v1/connect-requests/:id/refer
  router.patch(
    "/:id/refer",
    authenticate,
    requireRole("mentor"),
    validateObjectId,
    referRequestValidation,
    connectRequestController.referRequest,
  );

  // ── GENERIC FALLBACK ENDPOINTS ────────────────────────────────

  // @route   PATCH /api/v1/connect-requests/:id
  router.patch(
    "/:id",
    authenticate,
    validateObjectId,
    respondToRequestValidation,
    connectRequestController.respondToRequest,
  );

  // @route   DELETE /api/v1/connect-requests/:id
  router.delete(
    "/:id",
    authenticate,
    validateObjectId,
    connectRequestController.cancelRequest,
  );

  return router;
};

module.exports = createConnectRequestRoutes;
