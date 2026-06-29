/**
 * @fileoverview Cloudinary Media Storage Configuration and Verification Module.
 * @module config/cloudinary
 * @requires cloudinary
 */

const cloudinary = require("cloudinary").v2;
const env = require("./env");

// Initialize Cloudinary SDK using environmental system variables
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

/**
 * Pings the Cloudinary API to verify credentials and asset delivery routes.
 * * @async
 * @function verifyConnection
 * @throws {Error} If credentials are missing, incorrect, or the Cloudinary API is unreachable.
 * @returns {Promise<void>} Resolves successfully if the cloud gateway responds to the ping request.
 */
const verifyConnection = async () => {
  /*
   * No internal try/catch block is used here.
   * Allowing the error to bubble up allows our database bootstrapper (db.js)
   * to catch initialization failures cleanly and halt the server startup.
   */
  await cloudinary.api.ping();
};

module.exports = {
  cloudinary,
  verifyConnection,
};
