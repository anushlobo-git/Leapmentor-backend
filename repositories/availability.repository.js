const Availability = require("../models/Availability");

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_SESSION_DURATIONS = [30, 60];

/**
 * Retrieve availability by mentor ID.
 * @param {string}         mentorId
 * @param {ClientSession} [session]
 */
const findAvailabilityByMentor = (mentorId, session) => {
  const query = Availability.findOne({ mentor: mentorId });
  return session ? query.session(session) : query;
};

/**
 * Create a new availability document.
 * @param {Object}         data
 * @param {ClientSession} [session]
 */
const createAvailability = (data, session) => {
  const doc = {
    mentor: data.mentorId,
    timezone: data.timezone || DEFAULT_TIMEZONE,
    sessionDurations: data.sessionDurations || DEFAULT_SESSION_DURATIONS,
    specificDates: data.specificDates || [],
    weeklyHours: data.weeklyHours,
  };
  return session
    ? Availability.create([doc], { session })
    : Availability.create(doc);
};

/**
 * Update or upsert availability settings.
 * @param {string}         mentorId
 * @param {Object}         updates
 * @param {ClientSession} [session]
 */
const updateAvailability = (mentorId, updates, session) => {
  const query = Availability.findOneAndUpdate(
    { mentor: mentorId },
    { $set: updates },
    { new: true, runValidators: true, upsert: true },
  );
  return session ? query.session(session) : query;
};

/**
 * Delete availability document.
 * @param {string}         mentorId
 * @param {ClientSession} [session]
 */
const deleteAvailability = (mentorId, session) => {
  const query = Availability.findOneAndDelete({ mentor: mentorId });
  return session ? query.session(session) : query;
};

/**
 * Find by mentor ID — alias used in session/escrow services.
 * @param {string}         mentorId
 * @param {ClientSession} [session]
 */
const findByMentorId = (mentorId, session) => {
  return findAvailabilityByMentor(mentorId, session);
};

/**
 * Update Google Calendar config.
 * @param {string}         mentorId
 * @param {Object}         updateData
 * @param {ClientSession} [session]
 */
const updateGoogleCalendarConfig = (mentorId, updateData, session) => {
  const query = Availability.findOneAndUpdate(
    { mentor: mentorId },
    updateData,
    { upsert: true, new: true },
  );
  return session ? query.session(session) : query;
};

/**
 * Find availability with hidden calendar token exposed.
 * @param {string} mentorId
 */
const findWithCalendarToken = (mentorId) => {
  return Availability.findOne({ mentor: mentorId }).select(
    "+googleCalendarToken",
  );
};

module.exports = {
  findAvailabilityByMentor,
  findByMentorId,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  updateGoogleCalendarConfig,
  findWithCalendarToken,
};
