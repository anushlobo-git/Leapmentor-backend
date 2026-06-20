/**
 * @fileoverview Private Note Controller
 * @description Thin network gateway mapping transport parameter inputs straight to background notes engine services.
 */
const catchAsync = require("../utils/catchAsync");
const privateNoteService = require("../services/privateNote.service");

/**
 * Intercepts incoming requests parsing data inputs to spawn new personal notes records.
 * @route   POST /api/v1/private-notes
 * @access  Private (Session Participants Only)
 */
const createNote = catchAsync(async (req, res) => {
  const note = await privateNoteService.createPrivateNote(
    req.user._id,
    req.body,
  );
  res.status(201).json({
    success: true,
    note,
  });
});

/**
 * Exposes a localized collection of notes mapped specifically for the current logged-in participant.
 * @route   GET /api/v1/private-notes/:connectRequestId
 * @access  Private (Session Participants Only)
 */
const getNotes = catchAsync(async (req, res) => {
  const notes = await privateNoteService.getPrivateNotesList(
    req.params.connectRequestId,
    req.user._id,
  );
  res.status(200).json({
    success: true,
    notes,
  });
});

/**
 * Collects structural body data writing mutations across private note metrics.
 * @route   PATCH /api/v1/private-notes/:id
 * @access  Private (Author Only)
 */
const updateNote = catchAsync(async (req, res) => {
  const note = await privateNoteService.updatePrivateNote(
    req.params.id,
    req.user._id,
    req.body,
  );
  res.status(200).json({
    success: true,
    note,
  });
});

/**
 * Destroys targeted personal workspace records validating core owner contexts.
 * @route   DELETE /api/v1/private-notes/:id
 * @access  Private (Author Only)
 */
const deleteNote = catchAsync(async (req, res) => {
  await privateNoteService.removePrivateNote(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
});

module.exports = {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
};
