// utils/sendWithRetry.js
const transporter = require("./mailer");
const logger = require("../config/logger");

// Configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay
const MAX_DELAY_MS = 30_000; // never wait more than 30 seconds

/**
 * Wraps a promise with a timeout.
 * Why: If SMTP hangs for 60+ seconds, it blocks the retry cycle forever.
 */
const withTimeout = (promise, ms, label) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)),
      ms,
    ),
  );
  return Promise.race([promise, timeout]);
};

/**
 * Exponential backoff delay.
 * attempt 1 → wait 1s
 * attempt 2 → wait 2s
 * attempt 3 → wait 4s
 * (capped at MAX_DELAY_MS)
 */
const getBackoffDelay = (attempt) => {
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_DELAY_MS);
};

/**
 * Sends an email with automatic retry and exponential backoff.
 *
 * @param {Object} mailOptions - Nodemailer mail options (to, subject, html, etc.)
 * @param {string} label       - Human-readable name for logs ("OTP email", "Invoice email")
 * @returns {Promise<void>}
 */
const sendWithRetry = async (mailOptions, label = "email") => {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      //  Each send attempt has a 15-second hard timeout
      await withTimeout(transporter.sendMail(mailOptions), 15_000, label);

      logger.info(` ${label} sent successfully`, { attempt: attempt + 1 });
      return; // success — exit immediately
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (isLastAttempt) {
        logger.error(`❌ ${label} failed after ${MAX_RETRIES} attempts`, {
          message: err.message,
        });
        break;
      }

      const delay = getBackoffDelay(attempt);
      logger.warn(
        `⚠️ ${label} attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
        {
          message: err.message,
        },
      );

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // After all retries exhausted — throw so caller can decide what to do
  throw lastError;
};

module.exports = sendWithRetry;
