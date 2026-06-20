/**
 * @fileoverview Mentor Availability Service
 * @description  Business logic orchestration engine managing scheduling constraints,
 * fallback preferences configuration, runtime window splitting, and transaction blocking profiles.
 */

const AppError = require("../utils/AppError");
const availabilityRepository = require("../repositories/availability.repository");
const connectRequestRepository = require("../repositories/connectRequest.repository");
const slotLockRepository = require("../repositories/slotLock.repository");
const { generateAvailableSlots } = require("../utils/generateSlots");
const { toAvailabilityDTO } = require("../mappers/availability.mapper");

// Configuration Constants
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_DURATIONS = [30, 60];
const ALLOWED_DURATIONS = [30, 45, 60];

const ALLOWED_UPDATE_FIELDS = [
  "timezone",
  "sessionDurations",
  "weeklyHours",
  "specificDates",
  "googleCalendarConnected",
];

/**
 * Retrieve the authenticated mentor's availability record or returns fallback default configurations.
 * @param {string} mentorId    - Unique identifier database key of the mentor.
 * @returns {Promise<Object>}  The existing availability record entity or a localized default structure profile.
 */
const getMyAvailability = async (mentorId) => {
  const availability =
    await availabilityRepository.findAvailabilityByMentor(mentorId);

  if (!availability) {
    return {
      mentor: mentorId,
      timezone: DEFAULT_TIMEZONE,
      sessionDurations: DEFAULT_DURATIONS,
      googleCalendarConnected: false,
      specificDates: [],
      isNew: true,
    };
  }

  return toAvailabilityDTO(availability);
};

/**
 * Provision a brand new availability schedule profile configuration.
 * @param {string} mentorId    - Unique identifier database key of the mentor.
 * @param {Object} body        - Payload structure mapping configuration boundaries.
 * @throws {AppError} 409      - If an availability config documentation ledger already exists for the mentor.
 * @returns {Promise<Object>}  The newly initialized data model document fields confirmation payload.
 */
const createAvailability = async (mentorId, body) => {
  const existing =
    await availabilityRepository.findAvailabilityByMentor(mentorId);
  if (existing) {
    throw new AppError(
      "Availability already exists. Use PATCH /api/availability/me to update.",
      409,
    );
  }

  const { timezone, sessionDurations, specificDates } = body;
  return await availabilityRepository.createAvailability({
    mentorId,
    timezone,
    sessionDurations,
    specificDates,
  });
};

/**
 * Update explicit tracking configuration blocks inside an existing availability document.
 * @param {string} mentorId    - Unique identifier database key of the mentor.
 * @param {Object} body        - Data property updates mapping new preferences.
 * @throws {AppError} 400      - If the payload data attributes match no permitted configuration keys.
 * @returns {Promise<Object>}  The updated tracking confirmation database snapshot.
 */
const updateAvailability = async (mentorId, body) => {
  const updates = {};

  ALLOWED_UPDATE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields provided to update", 400);
  }

  return await availabilityRepository.updateAvailability(mentorId, updates);
};

/**
 * Retrieve public availability constraints for an external mentor visualization query.
 * @param {string} mentorId    - Unique identifier database key of the mentor.
 * @throws {AppError} 404      - If the target entity returns no documentation fields.
 * @returns {Promise<Object>}  Subset metadata dictionary highlighting active timeline parameters.
 */
const getMentorAvailability = async (mentorId) => {
  const availability =
    await availabilityRepository.findAvailabilityByMentor(mentorId);

  if (!availability) {
    throw new AppError("Availability not set by this mentor", 404);
  }

  return {
    timezone: availability.timezone,
    sessionDurations: availability.sessionDurations,
    specificDates: availability.specificDates,
  };
};

/**
 * Clear out an availability configuration ledger matching a specific mentor identity.
 * @param {string} mentorId   - Unique identifier database key of the mentor.
 * @returns {Promise<void>}
 */
const deleteAvailability = async (mentorId) => {
  await availabilityRepository.deleteAvailability(mentorId);
};

/**
 * Calculate empty schedulable time interval windows based on timeline constraints.
 * @description Validates duration inputs, gathers data records spanning active bookings
 * and short-term slot locks, combines blocked timelines, and calculates open appointment intervals.
 * @param {string} mentorId    - Unique identifier database key of the target mentor.
 * @param {number} duration    - Selected time interval slice segment constraint (minutes).
 * @param {string} userId      - Unique identifier database key of the inquiring user.
 * @throws {AppError} 400      - If the requested duration configuration does not match strict intervals.
 * @throws {AppError} 404      - If target availability data fields cannot be located.
 * @returns {Promise<Object>}  Dynamic collection list array displaying grouped open slot segments.
 */
const getAvailableSlots = async (mentorId, duration, userId) => {
  if (!ALLOWED_DURATIONS.includes(duration)) {
    throw new AppError("Duration must be 30, 45, or 60 minutes", 400);
  }

  const availability =
    await availabilityRepository.findAvailabilityByMentor(mentorId);
  if (!availability) {
    throw new AppError("Availability not set by this mentor", 404);
  }

  const [bookedRequests, activeLocks] = await Promise.all([
    connectRequestRepository.findBookedRequestsByMentor(mentorId),
    slotLockRepository.findActiveLocksByMentor(mentorId, userId),
  ]);

  const bookedSlots = bookedRequests.flatMap((r) => {
    const slots = r.selectedSlots || (r.selectedSlot ? [r.selectedSlot] : []);
    return slots.map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  });

  const lockedSlots = activeLocks.map((l) => ({
    date: l.date,
    startTime: l.startTime,
    endTime: l.endTime,
  }));

  const allBlockedSlots = [...bookedSlots, ...lockedSlots];

  const grouped = generateAvailableSlots(
    availability.specificDates || [],
    availability.weeklyHours || [],
    duration,
    allBlockedSlots,
    28, // generate 4 weeks ahead
  );

  return {
    timezone: availability.timezone,
    sessionDurations: availability.sessionDurations,
    slots: grouped,
  };
};

module.exports = {
  getMyAvailability,
  createAvailability,
  updateAvailability,
  getMentorAvailability,
  deleteAvailability,
  getAvailableSlots,
};
