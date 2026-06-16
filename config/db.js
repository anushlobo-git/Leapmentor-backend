/**
 * @fileoverview Core Database & Asset Storage Initialization Module.
 * @module config/db
 * @requires mongoose
 * @requires ./cloudinary
 * @requires ./logger
 */

const mongoose = require("mongoose");
const { verifyConnection } = require("./cloudinary");
const logger = require("./logger");

/**
 * Establishes a connection pool to the MongoDB cluster and verifies downstream
 * third-party media assets storage configurations.
 * * @async
 * @function connectDatabase
 * @throws {Error} If the connection string is malformed or the database cluster is unreachable.
 * @returns {Promise<void>} Resolves successfully when all core connections are verified.
 */
const connectDatabase = async () => {
  try {
    const connectionOptions = {
      autoIndex: true, // Automatically builds indexes (ideal for development synchronization)
    };

    /** @type {typeof import("mongoose")} */
    const conn = await mongoose.connect(
      process.env.MONGO_URI,
      connectionOptions,
    );
    logger.info(
      `🟢 MongoDB Connected | Host: ${conn.connection.host} | DB: ${conn.connection.name}`,
    );

    // Verify Cloudinary asset routing immediately after the DB pool is healthy
    await verifyConnection();
    logger.info("☁️ Cloudinary infrastructure verified and ready.");
  } catch (err) {
    logger.error(
      `❌ Critical External Service initialization failure: ${err.message}`,
    );

    /*
     * Exit code 1 notifies your process manager (PM2, Docker, AWS ECS)
     * that the server crashed, forcing a clean container reboot.
     */
    process.exit(1);
  }
};

module.exports = connectDatabase;
