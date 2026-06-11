/**
 * @fileoverview Mentor Profile Repository
 * @description  Direct database access layer mapping all operations to the MentorProfile Mongoose model.
 * Handles aggregation pipelines, profile selections, populates, and deletes without business logic.
 */

const MentorProfile = require("../models/MentorProfile");

// Configuration Constants
const INDUSTRY_STATS_LIMIT = 12;

/**
 * Aggregates mentor registration volumes grouped by industry sectors.
 * @returns {Promise<Array<Object>>} Sorted aggregation list containing industry IDs and frequencies.
 */
const getMentorIndustryStats = () =>
  MentorProfile.aggregate([
    { $match: { industry: { $exists: true, $ne: null, $ne: "" } } },
    { $group: { _id: "$industry", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: INDUSTRY_STATS_LIMIT },
  ]);

/**
 * Queries a list of mentor summaries matching a collection group of user IDs.
 * @param {Array<string>} userIds - Collection group of parent user reference IDs.
 * @returns {Promise<Array<Object>>} Lean summaries displaying user links and profile flags.
 */
const findMentorProfilesByUserIds = (userIds) =>
  MentorProfile.find({ user: { $in: userIds } })
    .select("user isProfileComplete isProfilePublished")
    .lean();

/**
 * Find an isolated lean mentor profile document linked to a specific user ID.
 * @param {string} userId - Parent user profile identifier reference key.
 * @returns {Promise<Object|null>} Lean profile record representation or null.
 */
const findMentorProfileByUserId = (userId) =>
  MentorProfile.findOne({ user: userId }).lean();

/**
 * Hard-delete a targeted mentor profile mapping matching a specific user ID.
 * @param {string} userId - Parent user profile identifier reference key.
 * @returns {Promise<Object|null>} Removed profile record tracking data map or null.
 */
const deleteMentorProfileByUserId = (userId) =>
  MentorProfile.findOneAndDelete({ user: userId });

/**
 * Retrieve all mentor profile entries including populated user details.
 * @returns {Promise<Array<Object>>} Lean collection displaying detailed mentor credentials.
 */
const findAllMentorProfiles = () =>
  MentorProfile.find({})
    .populate("user", "name email createdAt")
    .select(
      "user verificationStatus phoneNumber resumeDocument workExperienceDocuments " +
        "profilePicture bio skills currentRole company industry yearsOfExperience " +
        "languages averageRating totalSessions points",
    )
    .sort({ createdAt: -1 })
    .lean();

/**
 * Find a specific mentor profile layout by document ID including populated user metadata.
 * @param {string} id - Document reference identity key.
 * @returns {Promise<Object|null>} Lean populated profile mapping details or null.
 */
const findMentorProfileById = (id) =>
  MentorProfile.findById(id).populate("user", "name email createdAt").lean();

/**
 * Find a live mutable Mongoose mentor profile entity tracking document by ID.
 * @param {string} id - Document reference identity key.
 * @returns {Promise<Object|null>} Tracked live model document reference entity or null.
 */
const findMentorProfileByIdWithUser = (id) =>
  MentorProfile.findById(id).populate("user", "name email");

/**
 * Persist updates directly executed upon an active, tracked mentor profile document instance.
 * @param {Object} profile - Tracked live Mongoose document entity instance.
 * @returns {Promise<Object>} The updated and saved document.
 */
const saveMentorProfile = (profile) => profile.save();

/**
 * Retrieve basic biographical summary properties linked to a single mentor user ID.
 * @param {string} userId - Parent user profile identifier reference key.
 * @returns {Promise<Object|null>} Selected baseline profile snapshot layout or null.
 */
const findMentorProfile = (userId) =>
  MentorProfile.findOne({ user: userId })
    .select(
      "currentRole company profilePicture skills hourlyRate avgRating bio",
    )
    .lean();

/**
 * Retrieve comprehensive structural details linked to a single mentor user ID.
 * @param {string} userId - Parent user profile identifier reference key.
 * @returns {Promise<Object|null>} Complete extended biographical dataset map or null.
 */
const findMentorProfileFull = (userId) =>
  MentorProfile.findOne({ user: userId })
    .select(
      "currentRole company industry bio hourlyRate avgRating yearsOfExperience profilePicture skills",
    )
    .lean();

/**
 * Query detailed informational properties mapped for isolated mentor display panels.
 * @param {string} userId - Parent user profile identifier reference key.
 * @returns {Promise<Object|null>} Targeted data summary subset configuration or null.
 */
const findMentorProfileForDetail = (userId) =>
  MentorProfile.findOne({ user: userId })
    .select(
      "currentRole company profilePicture skills hourlyRate avgRating bio",
    )
    .lean();

/**
 * Retrieve explicit performance evaluation parameters linked to a mentor user ID.
 * @param {string} userId - Parent user profile identifier reference key.
 * @returns {Promise<Object|null>} Lean metrics object indicating scores and interaction counts or null.
 */
const findMentorRating = (userId) =>
  MentorProfile.findOne({ user: userId })
    .select("avgRating totalSessions")
    .lean();

/**
 * Updates the calculated aggregate average rating of a mentor profile by user ID.
 * @param {string} userId
 * @param {number} avgRating
 * @returns {Promise<MentorProfile|null>}
 */
const updateAvgRating = (userId, avgRating) => {
  return MentorProfile.findOneAndUpdate(
    { user: userId },
    { $set: { avgRating } },
    { new: true }
  );
};

module.exports = {
  getMentorIndustryStats,
  findMentorProfilesByUserIds,
  findMentorProfileByUserId,
  deleteMentorProfileByUserId,
  findAllMentorProfiles,
  findMentorProfileById,
  findMentorProfileByIdWithUser,
  saveMentorProfile,
  findMentorProfile,
  findMentorProfileFull,
  findMentorProfileForDetail,
  findMentorRating,
  updateAvgRating,
};
