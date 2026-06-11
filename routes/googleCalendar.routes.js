/**
 * @fileoverview Google Calendar Integration Routes
 * @description  Configures federated credential bindings, token exchanges, and live busy scheduling synchronizations.
 * @prefix       /api/v1/google-calendar
 * @access       Public / Private (User)
 */

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  getAuthUrl,
  handleCallback,
  disconnect,
  getBusySlots,
  getEvents,
} = require("../controllers/googleCalendar.controller");

// --- PUBLIC THIRD-PARTY OAUTH CALL CHANNELS ---

// @route   GET /api/v1/google-calendar/callback
router.get("/callback", handleCallback);

// --- SECURE DOMAIN OPERATIONAL PIPELINES ---
router.use(authenticate);

// @route   GET /api/v1/google-calendar/auth-url
router.get("/auth-url", getAuthUrl);

// @route   POST /api/v1/google-calendar/disconnect
router.post("/disconnect", disconnect);

// @route   GET /api/v1/google-calendar/busy
router.get("/busy", getBusySlots);

// @route   GET /api/v1/google-calendar/events
router.get("/events", getEvents);

module.exports = router;
