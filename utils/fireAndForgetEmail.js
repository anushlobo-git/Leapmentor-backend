// utils/fireAndForgetEmail.js
const logger = require("../config/logger");

/**
 * Runs an email function in the background with retry already built in.
 * The main request DOES NOT wait for this.
 * If it fails after all retries, it logs — it does NOT crash the server.
 *
 * Why: Emails are secondary. The user shouldn't wait for SMTP.
 * But we also shouldn't silently lose emails on the first failure.
 */
const fireAndForgetEmail = (emailFn, label) => {
  // setImmediate pushes this to the next event loop tick
  // so the HTTP response goes out first
  setImmediate(async () => {
    try {
      await emailFn(); // emailFn already uses sendWithRetry internally
      logger.info(`Background email sent: ${label}`);
    } catch (err) {
      // After all retries failed — log it, don't crash
      logger.error(`Background email failed permanently: ${label}`, {
        message: err.message,
      });
      // TODO: push to a dead-letter queue or alert here
    }
  });
};

module.exports = fireAndForgetEmail;
