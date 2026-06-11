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


/**
 * Finds a mentee profile by the associated user ID.
 * @param {string} userId
 * @returns {Promise<MenteeProfile|null>}
 */
const findByUserId = (userId) => {
  return MenteeProfile.findOne({ user: userId });
};

/**
 * Finds a mentee profile by user ID with populated account details.
 * @param {string} userId
 * @returns {Promise<MenteeProfile|null>}
 */
const findByUserIdWithAccountInfo = (userId) => {
  return MenteeProfile.findOne({ user: userId })
    .populate("user", "name email isEmailVerified");
};

/**
 * Finds a published public profile with basic user info population.
 * @param {string} userId
 * @returns {Promise<MenteeProfile|null>}
 */
const findPublishedByUserId = (userId) => {
  return MenteeProfile.findOne({
    user: userId,
    isProfilePublished: true,
  }).populate("user", "name email");
};

/**
 * Creates and persists a new mentee profile document.
 * @param {Object} profileData
 * @returns {Promise<MenteeProfile>}
 */
const create = (profileData) => {
  return MenteeProfile.create(profileData);
};

/**
 * Atomic find and update operational query execution wrapper.
 * @param {string} userId
 * @param {Object} updateData
 * @returns {Promise<MenteeProfile|null>}
 */
const findOneAndUpdateByUserId = (userId, updateData) => {
  return MenteeProfile.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

module.exports = {
  findMenteeProfilesByUserIds,
  findMenteeProfileByUserId,
  deleteMenteeProfileByUserId,
  findMenteeProfile,
  findByUserId,
  findByUserIdWithAccountInfo,
  findPublishedByUserId,
  create,
  findOneAndUpdateByUserId,
};
