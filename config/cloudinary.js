/**
 * @fileoverview Cloudinary Media Storage Configuration and Verification Module.
 * @module config/cloudinary
 * @requires cloudinary
 */

const cloudinary = require("cloudinary").v2;

// Initialize Cloudinary SDK using environmental system variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
