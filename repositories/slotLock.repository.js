/**
 * @fileoverview Slot Lock Repository
 * @description Inverted database access layer mapping actions to the SlotLock Mongoose model.
 * Handles checking short-term scheduling window transaction locks with zero concrete dependencies.
 */

const createSlotLockRepository = (SlotLock) => {
  /**
   * Retrieve active short-term slot locks belonging to a mentor, excluding a specific user's locks.
   * @param {string} mentorId      - Unique identifier database key of the mentor.
   * @param {string} excludeUserId - Unique identifier database key of the user to exclude.
   * @returns {Promise<Array<Object>>} Lean list array containing active short-term slot lock maps.
   */
  const findActiveLocksByMentor = (mentorId, excludeUserId) =>
    SlotLock.find({
      mentorId,
      lockedBy: { $ne: excludeUserId },
    }).lean();

  /**
   * Finds all active locks for a specific mentor and date.
   * @param {string} mentorId - Targeted advisor identifier.
   * @param {string} date - Target calendar date string.
   * @returns {Promise<Array<Object>>} Lean array containing current slot locks.
   */
  const findActiveLocksByMentorAndDate = (mentorId, date) => {
    return SlotLock.find({ mentorId, date }).lean();
  };

  /**
   * Atomically upserts an exclusive lock slot document to refresh or seed time holds.
   * @param {Object} queryCriteria - Unique matching parameters.
   * @param {Date} expiresAt - Calculated expiration deadline timestamp.
   * @returns {Promise<Object>} The updated or created document metadata.
   */
  const upsertSlotLock = (queryCriteria, expiresAt) => {
    return SlotLock.findOneAndUpdate(
      queryCriteria,
      { $set: { expiresAt } },
      { upsert: true, new: true },
    ).lean();
  };

  /**
   * Finds a single lock matching an exact slot tuple, regardless of which user
   * owns it. Used to inspect the doc that triggered a duplicate-key conflict.
   * @param {Object} slot - { mentorId, date, startTime, endTime }
   * @returns {Promise<Object|null>} The conflicting lock document or null.
   */
  const findLockBySlot = ({ mentorId, date, startTime, endTime }) => {
    return SlotLock.findOne({ mentorId, date, startTime, endTime }).lean();
  };

  /**
   * Removes a single lock by its primary identifier.
   * @param {string} id - The lock document _id.
   * @returns {Promise<Object>} Mongoose delete execution metadata.
   */
  const deleteLockById = (id) => {
    return SlotLock.deleteOne({ _id: id });
  };

  /**
   * Deletes a single specific slot lock matching the lock owner criteria.
   * @param {Object} filterCriteria - Unique identifying filter bounds.
   * @returns {Promise<Object|null>} Deleted data tracking parameters logs or null.
   */
  const deleteOneLock = (filterCriteria) => {
    return SlotLock.findOneAndDelete(filterCriteria);
  };

  /**
   * Bulk purges slot locks matching general filter dimensions blocks.
   * @param {Object} filter - Query criteria definitions map.
   * @returns {Promise<Object>} Mongoose delete query execution metadata summary.
   */
  const deleteManyLocks = (filter) => {
    return SlotLock.deleteMany(filter);
  };

  /**
   * Returns active locks assigned to a mentor, filtering out the requesting user's own holds.
   * @param {string} mentorId - Targeted advisor identity tracker.
   * @param {string} excludeUserId - Context identity pointer to filter out.
   * @returns {Promise<Array<Object>>} Lean plain object array containing active locks.
   */
  const findActiveLocksExcludingUser = (mentorId, excludeUserId) => {
    return SlotLock.find({
      mentorId,
      lockedBy: { $ne: excludeUserId },
    }).lean();
  };

  return {
    findActiveLocksByMentor,
    findActiveLocksByMentorAndDate,
    upsertSlotLock,
    findLockBySlot,
    deleteLockById,
    deleteOneLock,
    deleteManyLocks,
    findActiveLocksExcludingUser,
  };
};

module.exports = createSlotLockRepository;
