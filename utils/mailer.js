/**
 * @fileoverview SMTP Transporter Singleton
 * @module utils/mailer
 *
 * Creates the transporter ONCE and reuses it everywhere.
 * SMTP verification is intentionally NOT done here — it is handled
 * inside connectDatabase() alongside Mongo and Cloudinary so all
 * startup checks live in one place with unified retry logic.
 */
const env=require("../config/env");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: Number(env.smtp.port),
  secure: false,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  connectionTimeout: 10_000, // 10 seconds to connect
  greetingTimeout: 5_000, // 5 seconds for SMTP greeting
  socketTimeout: 15_000, // 15 seconds for data transfer
  pool: true, // reuse connections instead of open/close each time
  maxConnections: 5, // max parallel connections
});

module.exports = transporter;
