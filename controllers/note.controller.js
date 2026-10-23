/**
 * @fileoverview Note Controller
 * @description Thin network transport interface mapping multipart streams and data payloads to notes domains.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");

const createNoteController = ({ noteService }) => {
  const uploadNote = catchAsync(async (req, res, next) => {
    const note = await noteService.processNoteUpload(
      req.body.connectRequestId,
      req.user._id,
      req.file,
      req.body,
    );

    return sendSuccess(res, { note }, "Note uploaded successfully", STATUS.CREATED);
  });

  const getNotes = catchAsync(async (req, res, next) => {
    const notes = await noteService.getSharedNotesList(
      req.params.connectRequestId,
      req.user._id,
    );
    return sendSuccess(res, { notes }, "Notes retrieved");
  });

  const getPrivateNotes = catchAsync(async (req, res, next) => {
    const notes = await noteService.getPrivateNotesList(
      req.params.connectRequestId,
      req.user._id,
    );
    return sendSuccess(res, { notes }, "Private notes retrieved");
  });

  const deleteNote = catchAsync(async (req, res, next) => {
    await noteService.removeNoteRecord(req.params.id, req.user._id);
    return sendSuccess(res, null, "Note deleted successfully");
  });

  return {
    uploadNote,
    getNotes,
    getPrivateNotes,
    deleteNote,
  };
};

module.exports = createNoteController;
