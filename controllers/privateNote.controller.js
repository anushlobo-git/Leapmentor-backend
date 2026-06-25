/**
 * @fileoverview Private Note Controller
 * @description Thin network gateway mapping transport parameter inputs straight to background notes engine services.
 */

const catchAsync = require("../utils/catchAsync");

const createPrivateNoteController = (privateNoteService) => {
  const createNote = catchAsync(async (req, res, next) => {
    const note = await privateNoteService.createPrivateNote(
      req.user._id,
      req.body,
    );
    return res.status(201).json({
      success: true,
      note,
    });
  });

  const getNotes = catchAsync(async (req, res, next) => {
    const notes = await privateNoteService.getPrivateNotesList(
      req.params.connectRequestId,
      req.user._id,
    );
    return res.status(200).json({
      success: true,
      notes,
    });
  });

  const updateNote = catchAsync(async (req, res, next) => {
    const note = await privateNoteService.updatePrivateNote(
      req.params.id,
      req.user._id,
      req.body,
    );
    return res.status(200).json({
      success: true,
      note,
    });
  });

  const deleteNote = catchAsync(async (req, res, next) => {
    await privateNoteService.removePrivateNote(req.params.id, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  });

  return {
    createNote,
    getNotes,
    updateNote,
    deleteNote,
  };
};

module.exports = createPrivateNoteController;
