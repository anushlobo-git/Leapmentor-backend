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
const env = require("./config/env");

// ── ADD THESE TWO LINE ENTRANCES AT THE INITIALIZATION BLOCK ──
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger/index");

const errorHandler = require("./middleware/errorHandler");
const requestId = require("./middleware/requestId");
const requestLogger = require("./middleware/requestLogger");
const sanitizeRequest = require("./middleware/sanitizeRequest");
const {
  apiLimiter,
  authLimiter,
  aiLimiter,
} = require("./middleware/rateLimiter");

const createApp = (container = {}) => {
  const app = express();

  // ── helmet configurations tuning lines loops etc ──
  app.use(
    cors({
      origin: env.appBaseUrl || "http://localhost:5173",
      credentials: true,
    }),
  );

  const helmet = require("helmet");
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    compression({
      level: 6,
      threshold: 1024,
    }),
  );

  app.use(cookieParser());
  app.use(requestId);
  app.use(requestLogger);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(sanitizeRequest);

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/v1/google-calendar/callback")) {
      res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    } else {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    }
    next();
  });

  // ── INJECT SWAGGER ROUTING ENGINE DIRECTLY BEFORE TRAFFIC ROUTERS LANES LSTINGS ──
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ── 2. TRAFFIC PROTECTION & RATE BOUNDS ──────────────────────────────
  app.use("/api/v1", apiLimiter);
  app.use("/api/v1/auth", authLimiter);
  app.use("/api/v1/ai", aiLimiter);

  // ── 3. MONITORED SUBSYSTEMS ROUTER MATRICES ──────────────────────────
  const v1 = express.Router();
  const mountRouter = (path, router) => {
    if (
      router &&
      (typeof router === "function" || typeof router.handle === "function")
    ) {
      v1.use(path, router);
    }
  };

  // Fully Inverted Core Feature Domain Routers
  mountRouter("/ai", container.aiRouter);
  mountRouter("/auth", container.authRouter);
  mountRouter("/auth", container.forgotPasswordRouter);
  mountRouter("/verification", container.verificationRouter);
  mountRouter("/users", container.userRouter);
  mountRouter("/upload", container.uploadRouter);
  mountRouter("/mentor-profile", container.mentorProfileRouter);
  mountRouter("/mentee-profile", container.menteeProfileRouter);
  mountRouter("/mentors", container.mentorSearchRouter);
  mountRouter("/availability", container.availabilityRouter);
  mountRouter("/connect-requests", container.connectRequestRouter);
  mountRouter("/slot-locks", container.slotLockRouter);
  mountRouter("/escrow", container.escrowRouter);
  mountRouter("/invoices", container.invoiceRouter);
  mountRouter("/goals", container.goalRouter);
  mountRouter("/messages", container.messageRouter);
  mountRouter("/notes", container.noteRouter);
  mountRouter("/notifications", container.notificationRouter);
  mountRouter("/feedback", container.feedbackRouter);
  mountRouter("/reports", container.reportRouter);
  mountRouter("/sessions", container.sessionRouter);
  mountRouter("/private-notes", container.privateNoteRouter);
  mountRouter("/mentor/earnings", container.earningsRouter);
  mountRouter("/google-calendar", container.googleCalendarRouter);
  mountRouter("/support", container.supportRouter);

  // Inverted Administrative Management Routers
  mountRouter("/admin/settings", container.adminSettingsRouter);
  mountRouter("/admin/payments", container.adminPaymentsRouter);
  mountRouter("/admin/reports", container.adminReportsRouter);
  mountRouter("/admin/mentor-verifications", container.adminVerificationRouter);
  mountRouter("/admin", container.adminRouter);
  mountRouter("/leap-requests", container.leapRequestRouter);

  app.use("/api/v1", v1);

  app.get("/", (req, res) => res.send("🚀 LeapMentor API Running..."));

  Sentry.setupExpressErrorHandler(app);
  app.use(errors());
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
