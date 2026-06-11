/**
 * @fileoverview Milestone Repository
 * @description Direct database access layer for the Milestone model.
 */
const Milestone = require("../models/Milestone");

/**
 * Finds all milestones for a specific goal, sorted sequentially.
 * @param {string} goalId
 * @returns {Promise<Array<Milestone>>}
 */
const findAllByGoalSorted = (goalId) => {
  return Milestone.find({ goal: goalId })
    .sort({ order: 1, createdAt: 1 })
    .lean();
};

/**
 * Finds the milestone with the highest sorting sequence index for a specific goal.
 * @param {string} goalId
 * @returns {Promise<Milestone|null>}
 */
const findLastMilestone = (goalId) => {
  return Milestone.findOne({ goal: goalId }).sort({ order: -1 }).lean();
};

/**
 * Creates and persists a new milestone document.
 * @param {Object} data
 * @returns {Promise<Milestone>}
 */
const create = (data) => {
  return Milestone.create(data);
};

/**
 * Finds a milestone document by its unique ID.
 * @param {string} id
 * @returns {Promise<Milestone|null>}
 */
const findById = (id) => {
  return Milestone.findById(id);
};

/**
 * Saves modifications made to an active milestone instance.
 * @param {Object} milestoneInstance
 * @returns {Promise<Milestone>}
 */
const save = (milestoneInstance) => {
  return milestoneInstance.save();
};

/**
 * Removes a single milestone document by its unique ID.
 * @param {string} id
 * @returns {Promise<Milestone|null>}
 */
const deleteById = (id) => {
  return Milestone.findByIdAndDelete(id);
};

module.exports = {
  findAllByGoalSorted,
  findLastMilestone,
  create,
  findById,
  save,
  deleteById,
};
