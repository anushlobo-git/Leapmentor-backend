/**
 * @fileoverview Support Message Repository
 * @description Direct database access layer mapping all operations to the SupportMessage Mongoose model.
 */
const SupportMessage = require("../models/SupportMessage");

/**
 * Creates and persists a new support message ticket.
 * @param {Object} messageData - Structural fields matching the SupportMessage schema.
 * @returns {Promise<Object>} The persisted Mongoose document instance.
 */
const create = (messageData) => {
  return SupportMessage.create(messageData);
};

/**
 * Retrieves all support messages sorted by newest first.
 * @returns {Promise<Array<Object>>} Lean array containing plain support message objects.
 */
const findAllSortedByNewest = () => {
  return SupportMessage.find().sort({ createdAt: -1 }).lean();
};

/**
 * Atomically updates a support ticket status by its unique ID.
 * @param {string} id - Primary key document identifier.
 * @param {string} status - Target operational status string.
 * @returns {Promise<Object|null>} Updated document plain object context or null.
 */
const updateStatusById = (id, status) => {
  return SupportMessage.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true },
  ).lean();
};

module.exports = {
  create,
  findAllSortedByNewest,
  updateStatusById,
};
