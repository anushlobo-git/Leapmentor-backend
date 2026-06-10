/**
 * @fileoverview Slot Lock Repository
 * @description  Direct database access layer mapping all actions to the SlotLock Mongoose model.
 * Handles checking short-term scheduling window transaction locks without business logic.
 */

const SlotLock = require("../models/SlotLock");

/**
 * Retrieve active short-term slot locks belonging to a mentor, excluding a specific user's locks.
 * @param {string} mentorId      - Unique identifier database key of the mentor.
 * @param {string} excludeUserId - Unique identifier database key of the user to exclude from the match query.
 * @returns {Promise<Array<Object>>} Lean list array containing active short-term slot lock maps.
 */
const findActiveLocksByMentor = (mentorId, excludeUserId) =>
  SlotLock.find({
    mentorId,
    lockedBy: { $ne: excludeUserId },
  }).lean();

module.exports = { findActiveLocksByMentor };
