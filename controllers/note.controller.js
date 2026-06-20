/**
 * @fileoverview Note Controller
 * @description Thin network transmission interface mapping data payloads straight down to underlying notes orchestration domains.
 */
const catchAsync = require("../utils/catchAsync");
const noteService = require("../services/note.service");
const AppError = require("../utils/AppError");

/**
 * Processes multipart data streaming files directly down to the business engine logic layer.
 * @route   POST /api/v1/notes/upload
 * @access  Private (Session Participants Only)
 */
const uploadNote = catchAsync(async (req, res) => {
  const note = await noteService.processNoteUpload(
    req.body.connectRequestId,
    req.user._id,
    req.file,
    req.body,
  );

  res.status(201).json({
    success: true,
    message: "Note uploaded successfully",
    note,
  });
});

/**
 * Resolves all publicly distributed documentation files uploaded within an open session block.
 * @route   GET /api/v1/notes/:connectRequestId
 * @access  Private (Session Participants Only)
 */
const getNotes = catchAsync(async (req, res) => {
  const notes = await noteService.getSharedNotesList(
    req.params.connectRequestId,
    req.user._id,
  );
  res.status(200).json({
    success: true,
    notes,
  });
});

/**
 * Returns isolated background files stored explicitly under exclusive author flags tracking.
 * @route   GET /api/v1/notes/:connectRequestId/private
 * @access  Private (Session Participants Only)
 */
const getPrivateNotes = catchAsync(async (req, res) => {
  const notes = await noteService.getPrivateNotesList(
    req.params.connectRequestId,
    req.user._id,
  );
  res.status(200).json({
    success: true,
    notes,
  });
});

/**
 * Validates ownership credentials and wipes target documentation mappings.
 * @route   DELETE /api/v1/notes/:id
 * @access  Private (Author Only)
 */
const deleteNote = catchAsync(async (req, res) => {
  await noteService.removeNoteRecord(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
});

module.exports = {
  uploadNote,
  getNotes,
  getPrivateNotes,
  deleteNote,
};
