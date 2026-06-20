// mappers/availability.mapper.js

const toAvailabilityDTO = (availability) => ({
  id: availability._id,
  mentor: availability.mentor,
  timezone: availability.timezone,
  sessionDurations: availability.sessionDurations,
  weeklyHours: availability.weeklyHours,
  specificDates: availability.specificDates,
  googleCalendarConnected: availability.googleCalendarConnected,
  // googleCalendarToken deliberately excluded
  createdAt: availability.createdAt,
  updatedAt: availability.updatedAt,
});

module.exports = { toAvailabilityDTO };
