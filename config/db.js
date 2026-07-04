/**
 * @fileoverview Core Database & Asset Storage Initialization Module.
 * @module config/db
 */

const mongoose = require("mongoose");
const { verifyConnection } = require("./cloudinary");
const logger = require("./logger");
const { retryWithBackoff } = require("../utils/retryWithBackoff");
const transporter = require("../utils/mailer");
const env = require("./env");

const mongoOptions = {
  autoIndex: true,
  serverSelectionTimeoutMS: 10_000, // fail fast after 10s instead of Mongoose's 30s default
};

const closeDatabaseConnections = async () => {
  const connections = mongoose.connections.filter(
    (connection) => connection.readyState !== 0,
  );

  await Promise.allSettled(connections.map((connection) => connection.close()));
};

/**
 * Establishes MongoDB, verifies Cloudinary, and verifies SMTP — all as one
 * atomic startup gate with retry and exponential backoff.
 * On total failure, exits the process so the process manager can reboot cleanly.
 *
 * @async
 * @function connectDatabase
 * @returns {Promise<void>}
 */
const connectDatabase = () => {
  return retryWithBackoff(
    async () => {
      // ── 1. MongoDB ────────────────────────────────────────────
      const primaryConnection = await mongoose.connect(
        env.mongoUri,
        mongoOptions,
      );
      logger.info(
        `🟢 MongoDB Connected | Host: ${primaryConnection.connection.host} | DB: ${primaryConnection.connection.name}`,
      );

      if (env.mongoSecondaryUri) {
        const secondaryConnection = mongoose.createConnection(
          env.mongoSecondaryUri,
          mongoOptions,
        );
        await secondaryConnection.asPromise();
        logger.info(
          `🟢 Secondary MongoDB Connected | Host: ${secondaryConnection.host} | DB: ${secondaryConnection.name}`,
        );
      }

      // ── 2. Cloudinary ─────────────────────────────────────────
      await verifyConnection();
      logger.info("☁️  Cloudinary infrastructure verified and ready.");

      // ── 3. SMTP ───────────────────────────────────────────────
      // verify() is callback-based so we promisify it inline
      await new Promise((resolve, reject) => {
        transporter.verify((error) => {
          if (error) return reject(error);
          resolve();
        });
      });
      logger.info("📧 SMTP transporter ready.");
    },
    "DB/Cloudinary/SMTP init",
    {
      onExhausted: (err) => {
        logger.error(
          `❌ Critical External Service initialization failure: ${err.message}`,
        );
        process.exit(1);
      },
    },
  );
};

connectDatabase.closeDatabaseConnections = closeDatabaseConnections;

module.exports = connectDatabase;
