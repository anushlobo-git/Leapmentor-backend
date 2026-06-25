/**
 * @fileoverview Main Application Blueprint Configuration
 * @description Configures global middleware stacks, security parameters, and versioned
 * API endpoint sub-routers driven entirely via container dependency injection.
 */

require("dotenv").config();
require("./instrument.js");

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const Sentry = require("@sentry/node");
const { errors } = require("celebrate");

const errorHandler = require("./middleware/errorHandler");
const requestId = require("./middleware/requestId");
const requestLogger = require("./middleware/requestLogger");
const {
  apiLimiter,
  authLimiter,
  aiLimiter,
} = require("./middleware/rateLimiter");

/**
 * Configures the pipeline graph of an Express application instance.
 * @param {Object} container - Central resolution container holding fully wired decoupled routers.
 * @returns {express.Application} Compiled application framework processing engine.
 */
const createApp = (container = {}) => {
  const app = express();

  // ── 1. CORE SYSTEM SECURITY & TUNING PLUGINS ─────────────────────────
  app.use(
    cors({
      origin: process.env.APP_BASE_URL || "http://localhost:5173",
      credentials: true,
    }),
  );

  const helmet = require("helmet");
  //const mongoSanitize = require("express-mongo-sanitize");


  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, //  google calendar  OAuth 
    }),
  );
  //app.use(mongoSanitize());

  app.use(
    compression({
      level: 6,
      threshold: 1024, // Only compress responses exceeding 1KB
    }),
  );

  app.use(cookieParser());
  app.use(requestId);
  app.use(requestLogger);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/v1/google-calendar/callback")) {
      res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    } else {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    }
    next();
  });

  // ── 2. TRAFFIC PROTECTION & RATE BOUNDS ──────────────────────────────
  app.use("/api/v1", apiLimiter); // General platform middleware
  app.use("/api/v1/auth", authLimiter); // Strict security auth firewall
  app.use("/api/v1/ai", aiLimiter); // Strict specialized AI thresholds

  // ── 3. MONITORED SUBSYSTEMS ROUTER MATRICES ──────────────────────────
  const v1 = express.Router();

  // Fully Inverted Core Feature Domain Routers
  v1.use("/ai", container.aiRouter);
  v1.use("/auth", container.authRouter);
  v1.use("/auth", container.forgotPasswordRouter);
  v1.use("/verification", container.verificationRouter);
  v1.use("/users", container.userRouter);
  v1.use("/upload", container.uploadRouter);
  v1.use("/mentor-profile", container.mentorProfileRouter);
  v1.use("/mentee-profile", container.menteeProfileRouter);
  v1.use("/mentors", container.mentorSearchRouter);
  v1.use("/availability", container.availabilityRouter);
  v1.use("/connect-requests", container.connectRequestRouter);
  v1.use("/slot-locks", container.slotLockRouter);
  v1.use("/escrow", container.escrowRouter);
  v1.use("/invoices", container.invoiceRouter);
  v1.use("/goals", container.goalRouter);
  v1.use("/messages", container.messageRouter);
  v1.use("/notes", container.noteRouter);
  v1.use("/notifications", container.notificationRouter);
  v1.use("/feedback", container.feedbackRouter);
  v1.use("/reports", container.reportRouter);
  v1.use("/sessions", container.sessionRouter);
  v1.use("/private-notes", container.privateNoteRouter);
  v1.use("/mentor/earnings", container.earningsRouter);
  v1.use("/google-calendar", container.googleCalendarRouter);
  v1.use("/support", container.supportRouter);

  // Inverted Administrative Management Routers
  v1.use("/admin/settings", container.adminSettingsRouter);
  v1.use("/admin/payments", container.adminPaymentsRouter);
  v1.use("/admin/reports", container.adminReportsRouter);
  v1.use("/admin/mentor-verifications", container.adminVerificationRouter);
  v1.use("/admin", container.adminRouter);
  v1.use("/leap-requests", container.leapRequestRouter);

  // Mount Unified Versioned Routing Lane
  app.use("/api/v1", v1);

  app.get("/", (req, res) => res.send("🚀 LeapMentor API Running..."));

  // ── 4. FAULT ACCUMULATION TERMINALS ──────────────────────────────────
  Sentry.setupExpressErrorHandler(app);
  app.use(errors()); // Celebrate joi validation exception parser middleware
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
