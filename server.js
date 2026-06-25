/**
 * @fileoverview Application Entry Point. Responsible for managing the server lifecycle,
 * establishing database connections, spinning up WebSockets, running cron engine routines,
 * and intercepting terminal shutdown signals.
 * @description Utilizes a central dependency injection container to boot the factory-constructed application.
 */

require("dotenv").config();
require("./instrument.js"); // Sentry instrumentation must remain at the absolute top

const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

// Dynamic Dependency Infrastructure
const container = require("./config/container");
const createApp = require("./app");

const connectDatabase = require("./config/db");
const socketAuth = require("./socket/socketAuth");
const socketHandler = require("./socket/socketHandler");
const logger = require("./config/logger");

const { startCleanupCron } = require("./cron/cleanupAvailability");
const { startSessionReminderCron } = require("./cron/sessionReminders");

/** @const {number|string} PORT - Operational port for the incoming HTTP traffic */
const PORT = process.env.PORT || 5000;

/* ========================================================
   🔹 HTTP SERVER & WEBSOCKET ROUTING CONFIGURATION
======================================================== */

// Build the application layer on demand by passing the dependency mapping tree
const app = createApp(container);

/** @const {import('http').Server} httpServer - Native Node HTTP instance wrapping our DI Express App */
const httpServer = http.createServer(app);

/** @const {import('socket.io').Server} io - Real-time WebSocket engine instance */
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:4173",
      process.env.APP_BASE_URL,
    ],
    credentials: true,
  },
  pingTimeout: 60000, // Drops connection if client heartbeats take longer than 60s
  pingInterval: 25000, // Frequency of checking client connection health status
});

// Attach socket authentication and event routers
io.use(socketAuth);
socketHandler(io);

/* ========================================================
   🔹 APPLICATION LIFECYCLE MANAGERS
======================================================== */

/**
 * Orchestrates an ordered, synchronous application startup sequence.
 * Guarantees that networking lanes remain closed until the data layer is safe.
 */
const startServer = async () => {
  try {
    // Step 1: Halt execution until database buffers and pools are fully functional
    await connectDatabase();

    // Step 2: Initialize background schedules safely now that queries can execute
    startCleanupCron();
    startSessionReminderCron();
    logger.info("⏰ Background cron engines synchronized and running.");

    // Step 3: Open port listeners to start receiving live traffic
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server listening on port ${PORT}`);
      logger.info(`🔌 WebSocket transport lanes active`);
      logger.info(
        `🔑 Google Authentication: ${process.env.GOOGLE_CLIENT_ID ? "CONFIGURED" : "MISSING"}`,
      );
    });
  } catch (error) {
    logger.error(
      `❌ Critical server bootstrap error occurred: ${error.message}`,
    );
    process.exit(1);
  }
};

/**
 * Executes a clean disconnect sequence during platform restarts or crashes.
 * Prevents hanging sockets, aborted database queries, or unhandled states.
 */
const handleGracefulShutdown = (signal) => {
  logger.info(
    `\n🛑 ${signal} signal captured. Initiating graceful shutdown sequence...`,
  );

  // 1. Immediately drop incoming traffic requests
  httpServer.close(async () => {
    logger.info("🌐 HTTP and WebSocket routing grids isolated.");

    try {
      // 2. Shut down database pools so active modifications finish cleanly
      await mongoose.connection.close();
      logger.info("📦 MongoDB connection pools safely drained.");
      process.exit(0);
    } catch (err) {
      logger.error(
        `⚠️ Error encountered while severing database pool connection: ${err.message}`,
      );
      process.exit(1);
    }
  });

  // 3. Fail-safe timeout: Force terminate if connections refuse to release after 10 seconds
  setTimeout(() => {
    logger.error(
      "🚨 Forceful termination triggered: Application took too long to wrap up tasks.",
    );
    process.exit(1);
  }, 10000);
};

/* ========================================================
   🔹 GLOBAL EVENT RUNTIMES
======================================================== */

// Listen for termination signals from terminal managers (Ctrl+C) or host layers (Docker/AWS/Render)
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));

// Execute initialization script
startServer();
