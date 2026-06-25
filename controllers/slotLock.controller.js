/**
 * @fileoverview Slot Lock Domain Controller
 * @description Thin network gateway translating parameter queries and streaming clear JSON status objects.
 */

const catchAsync = require("../utils/catchAsync");

const createSlotLockController = (slotLockService) => {
  const lockSlot = catchAsync(async (req, res, next) => {
    const result = await slotLockService.acquireSlotLock(
      req.user._id,
      req.body,
    );
    return res.status(200).json({
      message: "Slot locked successfully",
      ...result,
    });
  });

  const unlockSlot = catchAsync(async (req, res, next) => {
    await slotLockService.releaseSlotLock(req.user._id, req.body);
    return res.status(200).json({ message: "Slot unlocked successfully" });
  });

  const unlockAllByMentee = catchAsync(async (req, res, next) => {
    await slotLockService.releaseAllUserLocks(req.user._id, req.body.mentorId);
    return res.status(200).json({ message: "All locks released successfully" });
  });

  const getActiveLocks = catchAsync(async (req, res, next) => {
    const result = await slotLockService.getMentorActiveLocksList(
      req.params.mentorId,
      req.user._id,
    );
    return res.status(200).json(result);
  });

  return {
    lockSlot,
    unlockSlot,
    unlockAllByMentee,
    getActiveLocks,
  };
};

module.exports = createSlotLockController;
