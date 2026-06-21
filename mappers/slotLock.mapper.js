/**
 * @fileoverview Slot Lock Data Transfer Object (DTO) Mapper
 * @description Decouples short-term database booking locks from structural client response formats.
 */

const toSlotLockDTO = (lock) => {
  if (!lock) return null;

  return {
    // Dual-ID Support: Complete frontend backward compatibility
    _id: lock._id,
    
    mentorId: lock.mentorId?._id?.toString() ?? lock.mentorId?.toString(),
    lockedBy: lock.lockedBy?._id?.toString() ?? lock.lockedBy?.toString(),
    date: lock.date || "",
    startTime: lock.startTime || "",
    endTime: lock.endTime || "",
    expiresAt: lock.expiresAt || null,
    createdAt: lock.createdAt,
    updatedAt: lock.updatedAt,
  };
};

module.exports = { toSlotLockDTO };
