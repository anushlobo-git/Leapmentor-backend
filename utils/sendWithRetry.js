/**
 * @fileoverview Email Send Utility with Retry
 * @module utils/sendWithRetry
 */

const transporter = require("./mailer");
const { retryWithBackoff } = require("./retryWithBackoff");

/**
 * Sends an email with automatic retry and exponential backoff.
 *
 * @param {Object} mailOptions - Nodemailer mail options (to, subject, html, etc.)
 * @param {string} label       - Human-readable name for logs ("OTP email", "Invoice email")
 * @returns {Promise<void>}
 */
const sendWithRetry = (mailOptions, label = "email") => {
  return retryWithBackoff(
    () => transporter.sendMail(mailOptions),
    label,
    { timeoutMs: 15_000 }, // 15s hard timeout per attempt, same as before
  );
  // throws on exhaustion — caller decides what to do, same behaviour as before
};

module.exports = sendWithRetry;
