/**
 * @fileoverview Goal Repository
 * @description Direct database access layer for the Goal model.
 */
const Goal = require("../models/Goal");

/**
 * Finds a single goal document by its associated connection request ID.
 * @param {string} connectRequestId
 * @returns {Promise<Goal|null>}
 */
const findOneByConnectRequest = (connectRequestId) => {
  return Goal.findOne({ connectRequest: connectRequestId });
};

/**
 * Finds a single goal document by its connection request ID as a plain JavaScript object.
 * @param {string} connectRequestId
 * @returns {Promise<Goal|null>}
 */
const findOneByConnectRequestLean = (connectRequestId) => {
  return Goal.findOne({ connectRequest: connectRequestId }).lean();
};

/**
 * Creates and persists a new goal document.
 * @param {Object} data
 * @returns {Promise<Goal>}
 */
const create = (data) => {
  return Goal.create(data);
};

/**
 * Finds a goal document by its unique ID.
 * @param {string} id
 * @returns {Promise<Goal|null>}
 */
const findById = (id) => {
  return Goal.findById(id);
};

/**
 * Saves modifications made to an active goal instance.
 * @param {Object} goalInstance
 * @returns {Promise<Goal>}
 */
const save = (goalInstance) => {
  return goalInstance.save();
};

module.exports = {
  findOneByConnectRequest,
  findOneByConnectRequestLean,
  create,
  findById,
  save,
};
