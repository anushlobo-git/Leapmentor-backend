/**
 * @fileoverview Private Note Business Logic Service
 * @description Coordinates participant session validation boundaries, text modifications,
 * and explicit authorship gates via constructor factory parameter injection.
 */

const AppError = require("../utils/AppError");

const ALLOWED_SESSION_STATUSES = new Set(["ongoing", "completed"]);
const DEFAULT_NOTE_TITLE = "Untitled Note";

const createPrivateNoteService = ({
  privateNoteRepository,
  connectRequestRepository,
  toPrivateNoteDTO,
}) => {
  /**
   * Internal Helper: Verifies that the current user belongs to the targeted engagement session.
   * @private
   */
  const _verifySessionParticipant = async (connectRequestId, userId) => {
    const request = await connectRequestRepository.findById(connectRequestId);
    if (!request) {
      throw new AppError("Target connection session request not found", 404);
    }

    if (!ALLOWED_SESSION_STATUSES.has(request.status)) {
      throw new AppError(
        "Cannot manipulate note assets for an inactive connection session",
        400,
      );
    }

    const identityToken = userId.toString();
    const isMentor = request.mentor.toString() === identityToken;
    const isMentee = request.mentee.toString() === identityToken;

    if (!isMentor && !isMentee) {
      throw new AppError(
        "Access denied: You are not a valid participant inside this engagement pool",
        403,
      );
    }
  };

  const createPrivateNote = async (userId, inputData) => {
    const { connectRequestId, title, content } = inputData;

    if (!connectRequestId) {
      throw new AppError(
        "connectRequestId data query parameter is required",
        400,
      );
    }

    await _verifySessionParticipant(connectRequestId, userId);

    const note = await privateNoteRepository.create({
      connectRequest: connectRequestId,
      author: userId,
      title: title?.trim() || DEFAULT_NOTE_TITLE,
      content: content || "",
    });

    return toPrivateNoteDTO(note);
  };

  const getPrivateNotesList = async (connectRequestId, userId) => {
    await _verifySessionParticipant(connectRequestId, userId);
    const notes = await privateNoteRepository.findBySessionAndAuthor(
      connectRequestId,
      userId,
    );
    return notes.map(toPrivateNoteDTO);
  };

  const updatePrivateNote = async (noteId, userId, updateData) => {
    const note = await privateNoteRepository.findById(noteId);
    if (!note) {
      throw new AppError(
        "Requested private note reference missing or deleted",
        404,
      );
    }

    if (note.author.toString() !== userId.toString()) {
      throw new AppError(
        "Authorization restriction: You can only edit your own private notes",
        403,
      );
    }

    if (updateData.title !== undefined) {
      note.title = updateData.title.trim() || DEFAULT_NOTE_TITLE;
    }
    if (updateData.content !== undefined) {
      note.content = updateData.content;
    }

    const updatedNote = await privateNoteRepository.save(note);
    return toPrivateNoteDTO(updatedNote);
  };

  const removePrivateNote = async (noteId, userId) => {
    const note = await privateNoteRepository.findById(noteId);
    if (!note) {
      throw new AppError(
        "Requested private note reference missing or deleted",
        404,
      );
    }

    if (note.author.toString() !== userId.toString()) {
      throw new AppError(
        "Authorization restriction: You can only delete your own private notes",
        403,
      );
    }

    await privateNoteRepository.deleteById(noteId);
  };

  return {
    createPrivateNote,
    getPrivateNotesList,
    updatePrivateNote,
    removePrivateNote,
  };
};

module.exports = createPrivateNoteService;
