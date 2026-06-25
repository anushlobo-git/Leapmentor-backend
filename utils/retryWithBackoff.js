/**
 * @fileoverview Generic Retry Utility with Exponential Backoff
 * @module utils/retryWithBackoff
 */

const logger = require("../config/logger");

// ── Shared Configuration ──────────────────────────────────────
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay
const MAX_DELAY_MS = 30_000; // never wait more than 30 seconds

/**
 * Wraps a promise with a hard timeout.
 * Prevents a hanging operation from blocking the retry cycle indefinitely.
 *
 * @param {Promise} promise - The operation to race against the timeout.
 * @param {number} ms       - Timeout in milliseconds.
 * @param {string} label    - Human-readable label used in the rejection message.
 * @returns {Promise}
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
 * Exponential backoff delay calculator.
 * attempt 0 → wait 1s
 * attempt 1 → wait 2s
 * attempt 2 → wait 4s
 * (capped at MAX_DELAY_MS)
 *
 * @param {number} attempt - Zero-based attempt index.
 * @returns {number} Delay in milliseconds.
 */
const getBackoffDelay = (attempt) => {
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_DELAY_MS);
};

/**
 * Executes an async operation with automatic retry and exponential backoff.
 *
 * @param {Function} fn           - Async function to execute. Receives the current attempt index.
 * @param {string}   label        - Human-readable name for logs ("OTP email", "DB connection")
 * @param {Object}   [options]
 * @param {number}   [options.timeoutMs]  - Optional per-attempt hard timeout in ms.
 * @param {Function} [options.onExhausted] - Called instead of throwing when all retries fail.
 *                                           Receives the last error. Useful for process.exit() scenarios.
 * @returns {Promise<void>}
 */
const retryWithBackoff = async (fn, label, options = {}) => {
  const { timeoutMs, onExhausted } = options;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const operation = fn(attempt);
      await (timeoutMs ? withTimeout(operation, timeoutMs, label) : operation);

      logger.info(`✅ ${label} succeeded`, { attempt: attempt + 1 });
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
        { message: err.message },
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Let the caller decide what to do on exhaustion
  if (onExhausted) {
    onExhausted(lastError);
  } else {
    throw lastError;
  }
};

module.exports = { retryWithBackoff, withTimeout };
