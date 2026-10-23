/**
 * @fileoverview Private Note Controller
 * @description Thin network gateway mapping transport parameter inputs straight to background notes engine services.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");

const createPrivateNoteController = ({ privateNoteService }) => {
  const createNote = catchAsync(async (req, res, next) => {
    const note = await privateNoteService.createPrivateNote(
      req.user._id,
      req.body,
    );
    return sendSuccess(res, { note }, "Private note created", STATUS.CREATED);
  });

  const getNotes = catchAsync(async (req, res, next) => {
    const notes = await privateNoteService.getPrivateNotesList(
      req.params.connectRequestId,
      req.user._id,
    );
    return sendSuccess(res, { notes }, "Private notes retrieved");
  });

  const updateNote = catchAsync(async (req, res, next) => {
    const note = await privateNoteService.updatePrivateNote(
      req.params.id,
      req.user._id,
      req.body,
    );
    return sendSuccess(res, { note }, "Private note updated");
  });

  const deleteNote = catchAsync(async (req, res, next) => {
    await privateNoteService.removePrivateNote(req.params.id, req.user._id);
    return sendSuccess(res, null, "Note deleted successfully");
  });

  return {
    createNote,
    getNotes,
    updateNote,
    deleteNote,
  };
};

module.exports = createPrivateNoteController;
