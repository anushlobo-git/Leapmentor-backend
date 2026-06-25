/**
 * @fileoverview Session Domain Controller
 * @description Decoupled gateway translating payload coordinates directly down into stateless execution logic engines.
 */

const catchAsync = require("../utils/catchAsync");

const createSessionController = (sessionService) => {
  const getSlots = catchAsync(async (req, res, next) => {
    const result = await sessionService.getSlots(
      req.params.connectRequestId,
      req.user._id,
    );
    return res.status(200).json({ success: true, ...result });
  });

  const setMeetingLink = catchAsync(async (req, res, next) => {
    const result = await sessionService.setMeetingLink({
      connectRequestId: req.params.connectRequestId,
      slotIndex: req.params.slotIndex,
      meetingLink: req.body.meetingLink,
      userId: req.user._id,
    });
    return res
      .status(200)
      .json({ success: true, message: "Meeting link updated", ...result });
  });

  const markSlotComplete = catchAsync(async (req, res, next) => {
    const result = await sessionService.markSlotComplete({
      connectRequestId: req.params.connectRequestId,
      slotIndex: req.params.slotIndex,
      userId: req.user._id,
    });
    return res.status(200).json(result);
  });

  const addSlot = catchAsync(async (req, res, next) => {
    const result = await sessionService.addSlot({
      connectRequestId: req.params.connectRequestId,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      userId: req.user._id,
    });
    return res.status(201).json({
      success: true,
      message: "Additional session slot added successfully",
      ...result,
    });
  });

  const cancelSlot = catchAsync(async (req, res, next) => {
    const result = await sessionService.cancelSlot({
      connectRequestId: req.params.connectRequestId,
      slotIndex: req.params.slotIndex,
      reason: req.body.reason,
      userId: req.user._id,
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Slot cancelled successfully",
        ...result,
      });
  });

  const rescheduleSlot = catchAsync(async (req, res, next) => {
    const result = await sessionService.rescheduleSlot({
      connectRequestId: req.params.connectRequestId,
      slotIndex: req.params.slotIndex,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      userId: req.user._id,
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Slot rescheduled successfully",
        ...result,
      });
  });

  const getMentorAvailability = catchAsync(async (req, res, next) => {
    const duration = Number.parseInt(req.query.duration, 10) || 60;
    const result = await sessionService.getMentorAvailability(
      req.params.connectRequestId,
      duration,
      req.user._id,
    );
    return res.status(200).json({ success: true, ...result });
  });

  return {
    getSlots,
    setMeetingLink,
    markSlotComplete,
    addSlot,
    cancelSlot,
    rescheduleSlot,
    getMentorAvailability,
  };
};

module.exports = createSessionController;
