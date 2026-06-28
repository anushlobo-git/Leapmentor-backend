/**
 * @fileoverview Google Calendar Integration Routes
 * @description Configures federated credential bindings, token exchanges, and live busy scheduling synchronizations.
 */

const express = require("express");

const createGoogleCalendarRoutes = ({ googleCalendarController, authenticate, validations }) => {
  const router = express.Router();
  const { handleCallbackValidation, getCalendarIntervalValidation } =
    validations;

  // --- PUBLIC THIRD-PARTY OAUTH CALL CHANNELS ---

  // @route   GET /api/v1/google-calendar/callback
  router.get(
    "/callback",
    handleCallbackValidation,
    googleCalendarController.handleCallback,
  );

  // --- SECURE DOMAIN OPERATIONAL PIPELINES ---
  router.use(authenticate);

  // @route   GET /api/v1/google-calendar/auth-url
  router.get("/auth-url", googleCalendarController.getAuthUrl);

  // @route   POST /api/v1/google-calendar/disconnect
  router.post("/disconnect", googleCalendarController.disconnect);

  // @route   GET /api/v1/google-calendar/busy
  router.get(
    "/busy",
    getCalendarIntervalValidation,
    googleCalendarController.getBusySlots,
  );

  // @route   GET /api/v1/google-calendar/events
  router.get(
    "/events",
    getCalendarIntervalValidation,
    googleCalendarController.getEvents,
  );

  return router;
};

module.exports = createGoogleCalendarRoutes;
