/**
 * @fileoverview Note Repository
 * @description Direct database access layer mapping all operations to the Note Mongoose model.
 */
const Note = require("../models/Note");

/**
 * Creates and persists a new note metadata document.
 * @param {Object} noteData - Structural parameters matching the Note schema.
 * @returns {Promise<Object>} The persisted raw database record.
 */
const create = (noteData) => {
  return Note.create(noteData);
};

/**
 * Finds a specific note document by its primary database identifier.
 * @param {string} id - The unique object identifier tracking the note.
 * @returns {Promise<Object|null>} The note document or null if unmapped.
 */
const findById = (id) => {
  return Note.findById(id);
};

/**
 * Finds a note by ID and populates uploader account properties using a lean footprint.
 * @param {string} id - The unique object identifier tracking the note.
 * @returns {Promise<Object|null>} Populated plain object tracking the note metadata.
 */
const findByIdWithUploaderLean = (id) => {
  return Note.findById(id).populate("uploadedBy", "name email").lean();
};

/**
 * Queries all publicly shared notes linked to an active connect session context.
 * @param {string} connectRequestId - Core connection reference tracking identity.
 * @returns {Promise<Array<Object>>} Lean list of shared note documents.
 */
const findSharedByConnectRequest = (connectRequestId) => {
  return Note.find({
    connectRequest: connectRequestId,
    isPrivate: { $ne: true },
  })
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Queries all private notes uploaded by an isolated user inside a specific session context.
 * @param {string} connectRequestId - Core connection reference tracking identity.
 * @param {string} userId - User ID of the note owner.
 * @returns {Promise<Array<Object>>} Lean list of private note documents.
 */
const findPrivateByConnectRequestAndUser = (connectRequestId, userId) => {
  return Note.find({
    connectRequest: connectRequestId,
    uploadedBy: userId,
    isPrivate: true,
  })
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Removes a targeted note record by document identifier.
 * @param {string} id - The unique object identifier tracking the note.
 * @returns {Promise<Object|null>} Deleted data logging details.
 */
const deleteById = (id) => {
  return Note.findByIdAndDelete(id);
};

module.exports = {
  create,
  findById,
  findByIdWithUploaderLean,
  findSharedByConnectRequest,
  findPrivateByConnectRequestAndUser,
  deleteById,
};
