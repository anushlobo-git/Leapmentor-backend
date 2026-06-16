const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redis = require("../config/redis");

const getIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || req.ip;
  return ip?.replace(/^::ffff:/, "") || "unknown";
};

const makeStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix,
  });

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: makeStore("rl:api:"),
  keyGenerator: (req) => getIP(req),
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: makeStore("rl:auth:"),
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase() || "";
    if (email) return `email:${email}`;
    return `ip:${getIP(req)}`;
  },
  message: {
    success: false,
    message: "Too many auth attempts, please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  store: makeStore("rl:ai:"),
  keyGenerator: (req) => req.user?._id?.toString() || getIP(req),
  message: {
    success: false,
    message: "AI request limit reached, please try again in an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const createUserLimiter = (max, windowMs, prefix, message) =>
  rateLimit({
    windowMs,
    max,
    store: makeStore(`rl:${prefix}:`),
    keyGenerator: (req) => req.user?._id?.toString() || getIP(req),
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const connectRequestLimiter = createUserLimiter(
  5,
  24 * 60 * 60 * 1000,
  "connect",
  "Daily connect request limit reached. Try again tomorrow.",
);

const bookingLimiter = createUserLimiter(
  10,
  60 * 60 * 1000,
  "booking",
  "Too many booking attempts. Try again in an hour.",
);

const escrowLimiter = createUserLimiter(
  20,
  60 * 60 * 1000,
  "escrow",
  "Too many payment attempts. Try again in an hour.",
);

module.exports = {
  apiLimiter,
  authLimiter,
  aiLimiter,
  connectRequestLimiter,
  bookingLimiter,
  escrowLimiter,
};
