// utils/mailer.js
const nodemailer = require("nodemailer");
const logger = require("../config/logger");

//  Created ONCE, reused everywhere — not recreated on every email call
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Connection timeout — prevents hanging forever if SMTP is down
  connectionTimeout: 10_000, // 10 seconds to connect
  greetingTimeout: 5_000, // 5 seconds for SMTP greeting
  socketTimeout: 15_000, // 15 seconds for data transfer
  pool: true, // reuse connections instead of open/close each time
  maxConnections: 5, // max parallel connections
});

// Verify on startup so you know immediately if SMTP is misconfigured
transporter.verify((error) => {
  if (error) {
    logger.error("SMTP transporter verification failed", {
      message: error.message,
    });
  } else {
    logger.info("SMTP transporter ready");
  }
});

module.exports = transporter;
