/**
 * @fileoverview Mentor Availability Service
 * @description Business logic orchestration engine managing scheduling constraints,
 * fallback preferences configuration, and appointment window calculations via parameter injection.
 */

const AppError = require("../utils/AppError");
const { generateAvailableSlots } = require("../utils/generateSlots");
const { toAvailabilityDTO } = require("../mappers/availability.mapper");

// Configuration Constants
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_DURATIONS = [30, 60];
const ALLOWED_DURATIONS = new Set([30, 45, 60]);

const ALLOWED_UPDATE_FIELDS = [
  "timezone",
  "sessionDurations",
  "weeklyHours",
  "specificDates",
  "googleCalendarConnected",
];

const createAvailabilityService = (
  availabilityRepository,
  connectRequestRepository,
  slotLockRepository,
) => {
  /**
   * Retrieve the authenticated mentor's availability record or returns fallback default configurations.
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

    const { timezone, sessionDurations, specificDates, weeklyHours } = body;
    return await availabilityRepository.createAvailability({
      mentorId,
      timezone,
      sessionDurations,
      specificDates,
      weeklyHours,
    });
  };

  /**
   * Update explicit tracking configuration blocks inside an existing availability document.
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
   */
  const deleteAvailability = async (mentorId) => {
    await availabilityRepository.deleteAvailability(mentorId);
  };

  /**
   * Calculate empty schedulable time interval windows based on timeline constraints.
   */
  const getAvailableSlots = async (mentorId, duration, userId) => {
    if (!ALLOWED_DURATIONS.has(duration)) {
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
      duration,
      availability.specificDates || [],
      availability.weeklyHours || [],
      allBlockedSlots,
      28, // generate 4 weeks ahead
    );

    return {
      timezone: availability.timezone,
      sessionDurations: availability.sessionDurations,
      slots: grouped,
    };
  };

  return {
    getMyAvailability,
    createAvailability,
    updateAvailability,
    getMentorAvailability,
    deleteAvailability,
    getAvailableSlots,
  };
};

module.exports = createAvailabilityService;
