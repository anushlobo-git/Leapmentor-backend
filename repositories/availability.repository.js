/**
 * @fileoverview Availability Repository
 * @description  Direct database access layer mapping all actions to the Availability Mongoose model.
 * Handles schedule extraction, data persistence, updates, and removals without business logic.
 */

const Availability = require("../models/Availability");

// Configuration Constants
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_SESSION_DURATIONS = [30, 60];

/**
 * Retrieve the availability schedule profile matching an isolated mentor ID.
 * @param {string} mentorId - Unique identifier database key of the mentor.
 * @returns {Promise<Object|null>} The availability document tracking data map or null.
 */
const findAvailabilityByMentor = (mentorId) =>
  Availability.findOne({ mentor: mentorId });

/**
 * Instantiate and persist a brand-new availability schedule configuration document.
 * @param {Object} data                   - Schedule configuration parameters payload.
 * @param {string} data.mentorId          - Unique identifier database key of the mentor.
 * @param {string} [data.timezone]        - The operational target timezone string reference.
 * @param {Array<number>} [data.sessionDurations] - Supported dynamic slot duration intervals.
 * @param {Array<Object>} [data.specificDates]    - Set of granular schedulable date-time windows.
 * @param {Object} [data.weeklyHours]     - Regular weekly fallback hour matrices.
 * @returns {Promise<Object>} The newly created availability database document tracking details.
 */
const createAvailability = (data) =>
  Availability.create({
    mentor: data.mentorId,
    timezone: data.timezone || DEFAULT_TIMEZONE,
    sessionDurations: data.sessionDurations || DEFAULT_SESSION_DURATIONS,
    specificDates: data.specificDates || [],
    weeklyHours: data.weeklyHours,
  });

/**
 * Update explicit schedule or tracking parameters inside an existing availability configuration, or upsert if non-existent.
 * @param {string} mentorId - Unique identifier database key of the mentor.
 * @param {Object} updates  - Data property maps containing the updated settings payload.
 * @returns {Promise<Object>} The updated validation context confirmation document.
 */
const updateAvailability = (mentorId, updates) =>
  Availability.findOneAndUpdate(
    { mentor: mentorId },
    { $set: updates },
    { new: true, runValidators: true, upsert: true },
  );

/**
 * Hard-delete an availability configuration mapping ledger matching a specific mentor identity.
 * @param {string} mentorId - Unique identifier database key of the mentor.
 * @returns {Promise<Object|null>} Removed configuration record confirmation metadata or null.
 */
const deleteAvailability = (mentorId) =>
  Availability.findOneAndDelete({ mentor: mentorId });

/**
 * Finds a mentor's availability configuration by their user ID.
 * @param {string} mentorId
 * @returns {Promise<Availability|null>}
 */
const findByMentorId = (mentorId) => {
  return Availability.findOne({ mentor: mentorId });
};

/**
 * Updates or creates a mentor's Google Calendar configuration properties.
 * @param {string} mentorId
 * @param {Object} updateData
 * @returns {Promise<Availability>}
 */
const updateGoogleCalendarConfig = (mentorId, updateData) => {
  return Availability.findOneAndUpdate(
    { mentor: mentorId },
    updateData,
    { upsert: true, new: true }
  );
};

/**
 * Finds a mentor's availability mapping, explicitly fetching the hidden calendar token.
 * @param {string} mentorId
 * @returns {Promise<Availability|null>}
 */
const findWithCalendarToken = (mentorId) => {
  return Availability.findOne({ mentor: mentorId }).select("+googleCalendarToken");
};

module.exports = {
  findAvailabilityByMentor,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  findByMentorId,
  updateGoogleCalendarConfig,
  findWithCalendarToken,
};
