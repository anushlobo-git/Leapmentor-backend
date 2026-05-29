const Availability = require("../models/Availability");

const findAvailabilityByMentor = (mentorId) =>
  Availability.findOne({ mentor: mentorId });

const createAvailability = (data) =>
  Availability.create({
    mentor: data.mentorId,
    timezone: data.timezone || "Asia/Kolkata",
    sessionDurations: data.sessionDurations || [30, 60],
    specificDates: data.specificDates || [],
    weeklyHours: data.weeklyHours,
  });

const updateAvailability = (mentorId, updates) =>
  Availability.findOneAndUpdate(
    { mentor: mentorId },
    { $set: updates },
    { new: true, runValidators: true, upsert: true },
  );

const deleteAvailability = (mentorId) =>
  Availability.findOneAndDelete({ mentor: mentorId });

module.exports = {
  findAvailabilityByMentor,
  createAvailability,
  updateAvailability,
  deleteAvailability,
};
