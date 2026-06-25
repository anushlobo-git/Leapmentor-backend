// mappers/availability.mapper.js

// mappers/availability.mapper.js
const toAvailabilityDTO = (availability) => {
  if (!availability) return null;

  return {
    // Dual-ID Support to prevent frontend breaking changes
    _id: availability._id?.toString() || null,

    mentor: availability.mentor?.toString() || availability.mentor || "",
    timezone: availability.timezone,
    sessionDurations: availability.sessionDurations || [],
    weeklyHours: availability.weeklyHours || [],
    specificDates: availability.specificDates || [],
    googleCalendarConnected: availability.googleCalendarConnected || false,
    
    createdAt: availability.createdAt || null,
    updatedAt: availability.updatedAt || null,
  };
};

module.exports = { toAvailabilityDTO };
