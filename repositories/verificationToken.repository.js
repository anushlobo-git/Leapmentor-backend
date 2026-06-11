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

/**
 * Deletes all existing verification token entries associated with a user ID.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const deleteTokensByUserId = (userId) => {
  return VerificationToken.deleteMany({ user: userId });
};

/**
 * Creates and persists a new verification token record.
 * @param {Object} tokenData
 * @returns {Promise<VerificationToken>}
 */
const createToken = (tokenData) => {
  return VerificationToken.create(tokenData);
};

/**
 * Finds a verification token record by user ID.
 * @param {string} userId
 * @returns {Promise<VerificationToken|null>}
 */
const findTokenByUserId = (userId) => {
  return VerificationToken.findOne({ user: userId });
};

/**
 * Persists updates made to an active token document instance.
 * @param {Object} tokenInstance
 * @returns {Promise<VerificationToken>}
 */
const saveToken = (tokenInstance) => {
  return tokenInstance.save();
};

module.exports = { 
  deleteAllForUser, 
  create, 
  findByUser, 
  extendExpiry,
  deleteTokensByUserId,
  createToken,
  findTokenByUserId,
  saveToken,
};
