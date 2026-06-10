const rateLimit = require("express-rate-limit");

// ─── 1. GENERAL API LIMITER ───────────────────────────────────
// All routes — generous limit, just stops abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 100 requests per 15 min per IP
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true, // sends RateLimit headers to client
  legacyHeaders: false,
});

// ─── 2. AUTH LIMITER ─────────────────────────────────────────
// Login, register, forgot password — strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // only 10 attempts per 15 min
  message: {
    success: false,
    message: "Too many auth attempts, please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── 3. AI LIMITER ───────────────────────────────────────────
// AI routes — expensive, protect your API bill
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 AI requests per hour per IP
  message: {
    success: false,
    message: "AI request limit reached, please try again in an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
