/**
 * @fileoverview Feedback Repository
 * @description Direct database access layer for the Feedback model.
 */
const Feedback = require("../models/Feedback");

/**
 * Finds a single feedback document matching a specific query.
 * @param {Object} query
 * @returns {Promise<Feedback|null>}
 */
const findOne = (query) => {
  return Feedback.findOne(query);
};

/**
 * Creates a new feedback document.
 * @param {Object} data
 * @returns {Promise<Feedback>}
 */
const create = (data) => {
  return Feedback.create(data);
};

/**
 * Finds a feedback document by ID and populates standard participant information.
 * @param {string} id
 * @returns {Promise<Feedback|null>}
 */
const findByIdAndPopulateParticipants = (id) => {
  return Feedback.findById(id)
    .populate("from", "name email")
    .populate("to", "name email")
    .lean();
};

/**
 * Finds all feedback entries recorded for a specific connection request.
 * @param {string} connectRequestId
 * @returns {Promise<Array<Feedback>>}
 */
const findAllByConnectRequest = (connectRequestId) => {
  return Feedback.find({ connectRequest: connectRequestId })
    .populate("from", "name email")
    .lean();
};

/**
 * Finds all feedback entries targeted toward a specific user ID.
 * @param {string} targetUserId
 * @returns {Promise<Array<Feedback>>}
 */
const findAllByTargetUser = (targetUserId) => {
  return Feedback.find({ to: targetUserId }).lean();
};

module.exports = {
  findOne,
  create,
  findByIdAndPopulateParticipants,
  findAllByConnectRequest,
  findAllByTargetUser,
};
