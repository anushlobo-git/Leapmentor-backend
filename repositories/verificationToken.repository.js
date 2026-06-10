// backend/repositories/verificationToken.repository.js
// ── Touches ONLY the VerificationToken model ──────────────────
const VerificationToken = require("../models/VerificationToken");

// Wipe all tokens for a user (before issuing a new one, or after reset)
const deleteAllForUser = (userId) =>
  VerificationToken.deleteMany({ user: userId });

// Create a new hashed OTP token record
const create = ({ userId, otpHash, expiresAt }) =>
  VerificationToken.create({ user: userId, otp: otpHash, expiresAt });

// Find the current token record for a user
const findByUser = (userId) => VerificationToken.findOne({ user: userId });

// Push expiry forward after OTP is verified (step-2 window)
const extendExpiry = (recordId, newExpiresAt) =>
  VerificationToken.findByIdAndUpdate(recordId, { expiresAt: newExpiresAt });

module.exports = { deleteAllForUser, create, findByUser, extendExpiry };
