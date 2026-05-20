const SlotLock = require("../models/SlotLock");

const findActiveLocksByMentor = (mentorId, excludeUserId) =>
  SlotLock.find({
    mentorId,
    lockedBy: { $ne: excludeUserId },
  }).lean();

module.exports = { findActiveLocksByMentor };
