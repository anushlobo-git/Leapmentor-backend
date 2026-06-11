/**
 * @fileoverview Session Domain Controller
 * @description Pure HTTP interface managing request mapping abstractions and parameters directed down onto underlying session service managers.
 */
const catchAsync = require("../utils/catchAsync");
const sessionService = require("../services/session.service");

/**
 * Returns structured parameters tracking all nested slot components relating to the targeted appointment context.
 * @route   GET /api/v1/sessions/:connectRequestId/slots
 * @access  Private (User)
 */
const getSlots = catchAsync(async (req, res) => {
  const result = await sessionService.getSlots(
    req.params.connectRequestId,
    req.user._id,
  );
  res.status(200).json({ success: true, ...result });
});

/**
 * Updates individual secure meeting address spaces allocated cross scheduled components.
 * @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/meeting-link
 * @access  Private (User)
 */
const setMeetingLink = catchAsync(async (req, res) => {
  const result = await sessionService.setMeetingLink({
    connectRequestId: req.params.connectRequestId,
    slotIndex: req.params.slotIndex,
    meetingLink: req.body.meetingLink,
    userId: req.user._id,
  });
  res
    .status(200)
    .json({ success: true, message: "Meeting link updated", ...result });
});

/**
 * Submits execution confirmations confirming real performance completion milestones.
 * @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/mark-complete
 * @access  Private (User)
 */
const markSlotComplete = catchAsync(async (req, res) => {
  const result = await sessionService.markSlotComplete({
    connectRequestId: req.params.connectRequestId,
    slotIndex: req.params.slotIndex,
    userId: req.user._id,
  });
  res.status(200).json(result);
});

/**
 * Extends scheduling chains appending newly requested single slot block structures.
 * @route   POST /api/v1/sessions/:connectRequestId/add-slot
 * @access  Private (User)
 */
const addSlot = catchAsync(async (req, res) => {
  const result = await sessionService.addSlot({
    connectRequestId: req.params.connectRequestId,
    date: req.body.date,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    userId: req.user._id,
  });
  res
    .status(201)
    .json({
      success: true,
      message: "Additional session slot added successfully",
      ...result,
    });
});

/**
 * Breaks off targeting scheduled item indices and triggers necessary proportional escrow returns back.
 * @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/cancel
 * @access  Private (User)
 */
const cancelSlot = catchAsync(async (req, res) => {
  const result = await sessionService.cancelSlot({
    connectRequestId: req.params.connectRequestId,
    slotIndex: req.params.slotIndex,
    reason: req.body.reason,
    userId: req.user._id,
  });
  res
    .status(200)
    .json({ success: true, message: "Slot cancelled successfully", ...result });
});

/**
 * Reconfigures individual calendar parameters shifting item coordinates without altering active holdings.
 * @route   PATCH /api/v1/sessions/:connectRequestId/slots/:slotIndex/reschedule
 * @access  Private (Mentee Only)
 */
const rescheduleSlot = catchAsync(async (req, res) => {
  const result = await sessionService.rescheduleSlot({
    connectRequestId: req.params.connectRequestId,
    slotIndex: req.params.slotIndex,
    date: req.body.date,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    userId: req.user._id,
  });
  res
    .status(200)
    .json({
      success: true,
      message: "Slot rescheduled successfully",
      ...result,
    });
});

/**
 * Exposes active availability configurations mapped natively against current reservations tracker indexes.
 * @route   GET /api/v1/sessions/:connectRequestId/mentor-availability
 * @access  Private (User)
 */
const getMentorAvailability = catchAsync(async (req, res) => {
  const duration = parseInt(req.query.duration, 10) || 60;
  const result = await sessionService.getMentorAvailability(
    req.params.connectRequestId,
    duration,
    req.user._id,
  );
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  getSlots,
  setMeetingLink,
  markSlotComplete,
  addSlot,
  cancelSlot,
  rescheduleSlot,
  getMentorAvailability,
};
