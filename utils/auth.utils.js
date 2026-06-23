const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const logger = require("../config/logger");
// auth.utils.js  — add this line near the top, after the requires
const STATE_SECRET = process.env.STATE_SECRET || process.env.JWT_SECRET;

// DELETED: createClerkClient — no longer needed after LinkedIn migration

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (userId) => {      
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const signAccessToken = (userId) =>
  jwt.sign({ id: userId ,type: "access" }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId ,type: "refresh" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });


const validateRoles = (roles) => {
  const validRoles = new Set(["mentor", "mentee"]);
  const uniqueRoles = [...new Set(roles)];
  for (const r of uniqueRoles) {
    if (!validRoles.has(r)) {
      return {
        valid: false,
        message: "Invalid role. Use mentor and/or mentee.",
      };
    }
  }
  return { valid: true, uniqueRoles };
};

const signState = (payload) => {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(data)
    .digest("hex");
  return `${data}.${sig}`;
};

// Verify state came back untampered
const verifyState = (state) => {
  const [data, sig] = state.split(".");
  const expected = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(data)
    .digest("hex");
  if (sig !== expected) throw new Error("Invalid state parameter");
  return JSON.parse(Buffer.from(data, "base64").toString());
};


module.exports = {
  googleClient,
  signToken,
  validateRoles,
  signState,
  verifyState,
  signAccessToken,
  signRefreshToken,
};
