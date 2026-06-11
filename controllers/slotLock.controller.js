/**
 * @fileoverview Slot Lock Domain Controller
 * @description Thin network gateway translating parameter queries and streaming clear JSON status objects.
 */
const catchAsync = require("../utils/catchAsync");
const slotLockService = require("../services/slotLock.service");

/**
 * Sets a temporary hold over a specified time block context.
 * @route   POST /api/v1/slot-locks/lock
 * @access  Private (Mentee Only)
 */
const lockSlot = catchAsync(async (req, res) => {
  const result = await slotLockService.acquireSlotLock(req.user._id, req.body);
  res.status(200).json({
    message: "Slot locked successfully",
    ...result,
  });
});

/**
 * Releases an active holding token context based on user un-selection changes.
 * @route   POST /api/v1/slot-locks/unlock
 * @access  Private (Mentee Only)
 */
const unlockSlot = catchAsync(async (req, res) => {
  await slotLockService.releaseSlotLock(req.user._id, req.body);
  res.status(200).json({ message: "Slot unlocked successfully" });
});

/**
 * Mass releases all active holdings tied to the active user context session.
 * @route   POST /api/v1/slot-locks/unlock-all
 * @access  Private (Mentee Only)
 */
const unlockAllByMentee = catchAsync(async (req, res) => {
  await slotLockService.releaseAllUserLocks(req.user._id, req.body.mentorId);
  res.status(200).json({ message: "All locks released successfully" });
});

/**
 * Compiles a list detailing foreign concurrent lock locks matching the requested advisor parameters.
 * @route   GET /api/v1/slot-locks/:mentorId
 * @access  Private
 */
const getActiveLocks = catchAsync(async (req, res) => {
  const result = await slotLockService.getMentorActiveLocksList(
    req.params.mentorId,
    req.user._id,
  );
  res.status(200).json(result);
});

module.exports = {
  lockSlot,
  unlockSlot,
  unlockAllByMentee,
  getActiveLocks,
};
