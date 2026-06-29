/**
 * @fileoverview Mentor Availability Controller
 * @description Thin request/response gateway handling setup, modification,
 * queries, and window chunk slotting evaluations via parameter dependency injection.
 */

const catchAsync = require("../utils/catchAsync");

const DEFAULT_DURATION_MINUTES = 60;

const createAvailabilityController = ({ availabilityService }) => {
  /**
   * Fetch the current authenticated user's availability settings.
   * @route   GET /api/v1/availability/me
   * @access  Private (Mentor)
   */
  const getMyAvailability = catchAsync(async (req, res, next) => {
    const data = await availabilityService.getMyAvailability(req.user._id);
    return res.status(200).json(data);
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

    return res.status(201).json({
      success: true,
      message: "Availability created successfully",
      availability,
    });
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

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability,
    });
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
    return res.status(200).json(data);
  });

  /**
   * Delete or completely clear the authenticated user's availability schedules.
   * @route   DELETE /api/v1/availability/me
   * @access  Private (Mentor)
   */
  const deleteAvailability = catchAsync(async (req, res, next) => {
    await availabilityService.deleteAvailability(req.user._id);

    return res.status(200).json({
      success: true,
      message: "Availability cleared successfully",
    });
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

    return res.status(200).json(data);
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
