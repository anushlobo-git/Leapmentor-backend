/**
 * @fileoverview Concurrent Session Slot Locking and Checking-Out System Routes Layout
 * @description Directs Express router paths, binding celebrate request schema validation layers via factory injection.
 */

const express = require("express");

const createSlotLockRoutes = (
  slotLockController,
  authenticate,
  validations,
) => {
  const router = express.Router();
  const {
    lockSlotValidation,
    unlockSlotValidation,
    unlockAllValidation,
    mentorIdParamValidation,
  } = validations;

  // Establish global pipeline authentication rules context monitoring parameter boundaries
  router.use(authenticate);

  // @route   POST /api/v1/slot-locks/lock
  router.post("/lock", lockSlotValidation, slotLockController.lockSlot);

  // @route   POST /api/v1/slot-locks/unlock
  router.post("/unlock", unlockSlotValidation, slotLockController.unlockSlot);

  // @route   POST /api/v1/slot-locks/unlock-all
  router.post(
    "/unlock-all",
    unlockAllValidation,
    slotLockController.unlockAllByMentee,
  );

  // @route   GET /api/v1/slot-locks/:mentorId
  router.get(
    "/:mentorId",
    mentorIdParamValidation,
    slotLockController.getActiveLocks,
  );

  return router;
};

module.exports = createSlotLockRoutes;
