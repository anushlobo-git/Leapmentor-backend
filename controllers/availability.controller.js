/**
 * @fileoverview Mentor Availability Controller
 * @description Thin request/response gateway handling setup, modification,
 * queries, and window chunk slotting evaluations via parameter dependency injection.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");

const DEFAULT_DURATION_MINUTES = 60;

const createAvailabilityController = ({ availabilityService }) => {
  /**
   * Fetch the current authenticated user's availability settings.
   * @route   GET /api/v1/availability/me
   * @access  Private (Mentor)
   */
  const getMyAvailability = catchAsync(async (req, res, next) => {
    const data = await availabilityService.getMyAvailability(req.user._id);
    return sendSuccess(res, data, "Availability retrieved");
  });

  /**
   * Create a new availability schedule configuration.
   * @route   POST /api/v1/availability
   * @access  Private (Mentor)
   */
  const createAvailability = catchAsync(async (req, res, next) => {
    const availability = await availabilityService.createAvailability(
      req.user._id,
      req.body,
    );

    return sendSuccess(
      res,
      { availability },
      "Availability created successfully",
      STATUS.CREATED,
    );
  });

  /**
   * Update the current authenticated user's availability schedule blocks.
   * @route   PATCH /api/v1/availability/me
   * @access  Private (Mentor)
   */
  const updateAvailability = catchAsync(async (req, res, next) => {
    const availability = await availabilityService.updateAvailability(
      req.user._id,
      req.body,
    );

    return sendSuccess(res, { availability }, "Availability updated successfully");
  });

  /**
   * Fetch a specific mentor's public availability profile configurations.
   * @route   GET /api/v1/availability/:mentorId
   * @access  Public
   */
  const getMentorAvailability = catchAsync(async (req, res, next) => {
    const data = await availabilityService.getMentorAvailability(
      req.params.mentorId,
    );
    return sendSuccess(res, data, "Mentor availability retrieved");
  });

  /**
   * Delete or completely clear the authenticated user's availability schedules.
   * @route   DELETE /api/v1/availability/me
   * @access  Private (Mentor)
   */
  const deleteAvailability = catchAsync(async (req, res, next) => {
    await availabilityService.deleteAvailability(req.user._id);

    return sendSuccess(res, null, "Availability cleared successfully");
  });

  /**
   * Generate list of empty schedulable time slots based on timeline durations.
   * @route   GET /api/v1/availability/:mentorId/slots
   * @access  Private (User)
   */
  const getAvailableSlots = catchAsync(async (req, res, next) => {
    const duration =
      Number.parseInt(req.query.duration, 10) || DEFAULT_DURATION_MINUTES;
    const data = await availabilityService.getAvailableSlots(
      req.params.mentorId,
      duration,
      req.user._id,
    );

    return sendSuccess(res, data, "Available slots retrieved");
  });

  return {
    getMyAvailability,
    createAvailability,
    updateAvailability,
    getMentorAvailability,
    deleteAvailability,
    getAvailableSlots,
  };
};

module.exports = createAvailabilityController;
