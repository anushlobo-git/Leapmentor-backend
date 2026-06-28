/**
 * @fileoverview Note Controller
 * @description Thin network transport interface mapping multipart streams and data payloads to notes domains.
 */

const catchAsync = require("../utils/catchAsync");

const createNoteController = ({ noteService }) => {
  const uploadNote = catchAsync(async (req, res, next) => {
    const note = await noteService.processNoteUpload(
      req.body.connectRequestId,
      req.user._id,
      req.file,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Note uploaded successfully",
      note,
    });
  });

  const getNotes = catchAsync(async (req, res, next) => {
    const notes = await noteService.getSharedNotesList(
      req.params.connectRequestId,
      req.user._id,
    );
    return res.status(200).json({
      success: true,
      notes,
    });
  });

  const getPrivateNotes = catchAsync(async (req, res, next) => {
    const notes = await noteService.getPrivateNotesList(
      req.params.connectRequestId,
      req.user._id,
    );
    return res.status(200).json({
      success: true,
      notes,
    });
  });

  const deleteNote = catchAsync(async (req, res, next) => {
    await noteService.removeNoteRecord(req.params.id, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  });

  return {
    uploadNote,
    getNotes,
    getPrivateNotes,
    deleteNote,
  };
};

module.exports = createNoteController;
