/**
 * @fileoverview Slot Lock Business Logic Service
 * @description Manages time-block conversion matrices, evaluates overlap conditions, and handles temporary lock expirations.
 */
const AppError = require("../utils/AppError");

// Repositories
const slotLockRepository = require("../repositories/slotLock.repository");
const connectRequestRepository = require("../repositories/connectRequest.repository");

// Mappers
const { toSlotLockDTO } = require("../mappers/slotLock.mapper");

// Upper-case Domain Architecture Constants
const LOCK_DURATION_MINUTES = 10;
const TIME_CONVERSION_BASE = 60;

/**
 * Parses standard string time structures converting entries to integer minutes.
 * @private
 */
const convertTimeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * TIME_CONVERSION_BASE + minutes;
};

/**
 * Evaluates binary timeline conditions checking for calendar scheduling collisions.
 * @private
 */
const checkTimelineOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

/**
 * Places a temporary structural lock over a mentor's calendar slot to allow for checkout.
 * @description Validates incoming body parameters, checks confirmed appointments via populated repository joins,
 * scans active concurrent lock instances, runs cross-overlapping checks, and executes an atomic lookup upsert.
 * @param {string} menteeId - Initiating user account credentials token tracking.
 * @param {Object} inputFields - Core parameters indicating date, advisor contexts, and times.
 * @throws {AppError} 400 | 409
 * @returns {Promise<Object>} Calculated lock metrics containing expiration parameters configurations.
 */
const acquireSlotLock = async (menteeId, inputFields) => {
  const { mentorId, date, startTime, endTime } = inputFields;

  if (!mentorId || !date || !startTime || !endTime) {
    throw new AppError(
      "Missing required parameter elements inside input fields maps",
      400,
    );
  }

  const sessionStartMinutes = convertTimeToMinutes(startTime);
  const sessionEndMinutes = convertTimeToMinutes(endTime);

  // Reuses your existing repository's lean optimization method to fetch booked requests
  const confirmedBookings =
    await connectRequestRepository.findBookedRequestsByMentor(mentorId);

  const mappedBookedSlots = confirmedBookings.flatMap((booking) => {
    const slotsCollection =
      booking.selectedSlots ||
      (booking.selectedSlot ? [booking.selectedSlot] : []);
    return slotsCollection.map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  });

  const isAlreadyBooked = mappedBookedSlots.some((bookingSlot) => {
    if (bookingSlot.date !== date) return false;
    return checkTimelineOverlap(
      sessionStartMinutes,
      sessionEndMinutes,
      convertTimeToMinutes(bookingSlot.startTime),
      convertTimeToMinutes(bookingSlot.endTime),
    );
  });

  if (isAlreadyBooked) {
    const error = new AppError(
      "Conflict constraint triggered: This slot has already been permanently booked",
      409,
    );
    error.code = "SLOT_BOOKED";
    throw error;
  }

  const activeLocks = await slotLockRepository.findActiveLocksByMentorAndDate(
    mentorId,
    date,
  );

  const isTemporarilyLocked = activeLocks.some((activeLock) => {
    // Self-id check optimization allows matching mentees to extend or refresh their existing holding timers
    if (activeLock.lockedBy.toString() === menteeId.toString()) return false;
    return checkTimelineOverlap(
      sessionStartMinutes,
      sessionEndMinutes,
      convertTimeToMinutes(activeLock.startTime),
      convertTimeToMinutes(activeLock.endTime),
    );
  });

  if (isTemporarilyLocked) {
    const error = new AppError(
      "Availability restriction: This slot is temporarily held by another checking-out user",
      409,
    );
    error.code = "SLOT_LOCKED";
    throw error;
  }

  const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  await slotLockRepository.upsertSlotLock(
    { mentorId, date, startTime, endTime, lockedBy: menteeId },
    expiresAt,
  );

  return {
    expiresAt,
    lockedFor: LOCK_DURATION_MINUTES,
  };
};

/**
 * Removes a specific temporary lock block if a user deselects a calendar option.
 */
const releaseSlotLock = async (menteeId, inputFields) => {
  const { mentorId, date, startTime, endTime } = inputFields;

  if (!mentorId || !date || !startTime || !endTime) {
    throw new AppError(
      "Missing required parameter elements inside input fields maps",
      400,
    );
  }

  await slotLockRepository.deleteOneLock({
    mentorId,
    date,
    startTime,
    endTime,
    lockedBy: menteeId,
  });
};

/**
 * Releases all active holds managed under the current user context (e.g., when closing selection panels).
 */
const releaseAllUserLocks = async (menteeId, mentorId) => {
  const filter = { lockedBy: menteeId };
  if (mentorId) filter.mentorId = mentorId;

  await slotLockRepository.deleteManyLocks(filter);
};

/**
 * Exposes active concurrent locks targeting a specific mentor profile.
 */
const getMentorActiveLocksList = async (mentorId, requestingUserId) => {
  const locks = await slotLockRepository.findActiveLocksExcludingUser(
    mentorId,
    requestingUserId,
  );

  return {
    //  Clean and format the collection array via the DTO mapper before returning
    locks: locks.map(toSlotLockDTO),
  };
};

module.exports = {
  acquireSlotLock,
  releaseSlotLock,
  releaseAllUserLocks,
  getMentorActiveLocksList,
};
