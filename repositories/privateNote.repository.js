/**
 * @fileoverview Private Note Repository
 * @description Direct database access layer mapping all operations to the PrivateNote Mongoose model.
 */
const PrivateNote = require("../models/PrivateNote");

/**
 * Creates and persists a new private note document.
 * @param {Object} noteData - Structural fields matching the PrivateNote schema.
 * @returns {Promise<Object>} The persisted Mongoose document.
 */
const create = (noteData) => {
  return PrivateNote.create(noteData);
};

/**
 * Finds all private notes for a specific author within a connection request workspace.
 * @param {string} connectRequestId - Core connection reference tracking identity.
 * @param {string} authorId - Unique identifier of the note creator.
 * @returns {Promise<Array<Object>>} Lean array containing plain note objects.
 */
const findBySessionAndAuthor = (connectRequestId, authorId) => {
  return PrivateNote.find({
    connectRequest: connectRequestId,
    author: authorId,
  })
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * Finds a single live tracked private note by its primary document ID.
 * @param {string} id - Unique document identifier key.
 * @returns {Promise<Object|null>} Tracked Mongoose document or null.
 */
const findById = (id) => {
  return PrivateNote.findById(id);
};

/**
 * Saves modifications made to an active Mongoose document instance.
 * @param {Object} noteDocument - Live mutable Mongoose document reference.
 * @returns {Promise<Object>} The updated and saved document object.
 */
const save = (noteDocument) => {
  return noteDocument.save();
};

/**
 * Removes a single targeted private note document by its primary identifier.
 * @param {string} id - Unique document identifier key.
 * @returns {Promise<Object|null>} Deleted data logging record.
 */
const deleteById = (id) => {
  return PrivateNote.findByIdAndDelete(id);
};

module.exports = {
  create,
  findBySessionAndAuthor,
  findById,
  save,
  deleteById,
};
