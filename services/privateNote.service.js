/**
 * @fileoverview Private Note Business Logic Service
 * @description Coordinates participant session validation boundaries, text modifications, and explicit authorship gates.
 */
const AppError = require("../utils/AppError");
const privateNoteRepository = require("../repositories/privateNote.repository");
const connectRequestRepository = require("../repositories/connectRequest.repository");

// Upper-case Domain Architecture Constants
const ALLOWED_SESSION_STATUSES = ["ongoing", "completed"];
const DEFAULT_NOTE_TITLE = "Untitled Note";

/**
 * Internal Helper: Verifies that the current user belongs to the targeted engagement session.
 * @throws {AppError} 400 | 403 | 404
 */
const verifySessionParticipant = async (connectRequestId, userId) => {
  const request = await connectRequestRepository.findById(connectRequestId);
  if (!request) {
    throw new AppError("Target connection session request not found", 404);
  }

  if (!ALLOWED_SESSION_STATUSES.includes(request.status)) {
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

/**
 * Validates session context access and spawns a new private note.
 * @param {string} userId - Author context identifier token.
 * @param {Object} inputData - Creation parameters mapping title and content.
 * @throws {AppError} 400
 * @returns {Promise<Object>} The generated note record payload.
 */
const createPrivateNote = async (userId, inputData) => {
  const { connectRequestId, title, content } = inputData;

  if (!connectRequestId) {
    throw new AppError(
      "connectRequestId data query parameter is required",
      400,
    );
  }

  await verifySessionParticipant(connectRequestId, userId);

  return privateNoteRepository.create({
    connectRequest: connectRequestId,
    author: userId,
    title: title?.trim() || DEFAULT_NOTE_TITLE,
    content: content || "",
  });
};

/**
 * Resolves all personal notes owned by a participant within a specific session window.
 */
const getPrivateNotesList = async (connectRequestId, userId) => {
  await verifySessionParticipant(connectRequestId, userId);
  return privateNoteRepository.findBySessionAndAuthor(connectRequestId, userId);
};

/**
 * Mutates structural text fields matching an active note after executing authorship validation blocks.
 * @param {string} noteId
 * @param {string} userId
 * @param {Object} updateData - Modifiable fields carrying updated strings text.
 * @throws {AppError} 403 | 404
 * @returns {Promise<Object>} The updated note record payload.
 */
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

  return privateNoteRepository.save(note);
};

/**
 * Hard deletes an isolated note reference context verified against author parameters.
 * @param {string} noteId
 * @param {string} userId
 * @throws {AppError} 403 | 404
 */
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

module.exports = {
  createPrivateNote,
  getPrivateNotesList,
  updatePrivateNote,
  removePrivateNote,
};
