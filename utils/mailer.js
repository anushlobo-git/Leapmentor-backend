/**
 * @fileoverview SMTP Transporter Singleton
 * @module utils/mailer
 *
 * Creates the transporter ONCE and reuses it everywhere.
 * SMTP verification is intentionally NOT done here — it is handled
 * inside connectDatabase() alongside Mongo and Cloudinary so all
 * startup checks live in one place with unified retry logic.
 */

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10_000, // 10 seconds to connect
  greetingTimeout: 5_000, // 5 seconds for SMTP greeting
  socketTimeout: 15_000, // 15 seconds for data transfer
  pool: true, // reuse connections instead of open/close each time
  maxConnections: 5, // max parallel connections
});

module.exports = transporter;
