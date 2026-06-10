/**
 * @fileoverview Mentee Profile Repository
 * @description  Direct database access layer mapping all actions to the MenteeProfile schema.
 * Contains no validation logic or business constraints.
 */

const MenteeProfile = require("../models/MenteeProfile");

/**
 * Queries a list of mentee tracking states checking a series of parent user IDs.
 * @param {Array<string>} userIds - Target array containing parent entity tracking IDs.
 * @returns {Promise<Array<Object>>} Lean collection displaying account visibility metrics.
 */
const findMenteeProfilesByUserIds = (userIds) =>
  MenteeProfile.find({ user: { $in: userIds } })
    .select("user isProfileComplete isProfilePublished")
    .lean();

/**
 * Find an isolated mentee record linked to an explicit user identification key.
 * @param {string} userId - Core reference linking parent identity configurations.
 * @returns {Promise<Object|null>} Target biographical details layout map.
 */
const findMenteeProfileByUserId = (userId) =>
  MenteeProfile.findOne({ user: userId }).lean();

/**
 * Hard-delete a target profiling mapping matching a specific user context.
 * @param {string} userId - Core reference linking parent identity configurations.
 * @returns {Promise<Object|null>} Deleted profile record content tracking map.
 */
const deleteMenteeProfileByUserId = (userId) =>
  MenteeProfile.findOneAndDelete({ user: userId });

/**
 * Query detailed functional information mapping to a single mentee profile view.
 * @param {string} userId - Core reference linking parent identity configurations.
 * @returns {Promise<Object|null>} Filtered dataset mapping individual target metrics.
 */
const findMenteeProfile = (userId) =>
  MenteeProfile.findOne({ user: userId })
    .select("currentRole company profilePicture skills bio interestedFields")
    .lean();

module.exports = {
  findMenteeProfilesByUserIds,
  findMenteeProfileByUserId,
  deleteMenteeProfileByUserId,
  findMenteeProfile,
};
