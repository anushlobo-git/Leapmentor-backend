/**
 * @fileoverview Concurrent Session Slot Locking and Checking-Out System Routes Layout
 * @prefix       /api/v1/slot-locks
 * @access       Private (Authenticated Dashboard States Only)
 */
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  lockSlot,
  unlockSlot,
  unlockAllByMentee,
  getActiveLocks,
} = require("../controllers/slotLock.controller");

// Establish global pipeline authentication rules context monitoring parameter boundaries
router.use(authenticate);

// @route   POST /api/v1/slot-locks/lock
router.post("/lock", lockSlot);

// @route   POST /api/v1/slot-locks/unlock
router.post("/unlock", unlockSlot);

// @route   POST /api/v1/slot-locks/unlock-all
router.post("/unlock-all", unlockAllByMentee);

// @route   GET /api/v1/slot-locks/:mentorId
router.get("/:mentorId", getActiveLocks);

module.exports = router;