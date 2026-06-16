/**
 * @fileoverview Core Database & Asset Storage Initialization Module.
 * @module config/db
 * @requires mongoose
 * @requires ./cloudinary
 */

const mongoose = require("mongoose");
const { verifyConnection } = require("./cloudinary");

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
    // Ensure the Mongoose connection options match modern driver expectations
    const connectionOptions = {
      autoIndex: true, // Build indexes automatically in development (disable in high-scale prod if needed)
    };

    /**
     * @type {typeof import("mongoose")}
     */
    const conn = await mongoose.connect(
      process.env.MONGO_URI,
      connectionOptions,
    );
    console.log(
      `🟢 MongoDB Connected: Host: ${conn.connection.host} | DB: ${conn.connection.name}`,
    );

    // 2. Immediately verify dependent cloud asset channels (Cloudinary)
    await verifyConnection();
    console.log("☁️ Cloudinary storage connection verified successfully.");
  } catch (err) {
    console.error("❌ Critical Database initialization failure:", err.message);

    /*
     * Exit code 1 indicates an unhandled crash. This triggers process managers
     * (like PM2, Docker, or AWS ECS) to automatically spin up a fresh instance.
     */
    process.exit(1);
  }
};

module.exports = connectDatabase;
