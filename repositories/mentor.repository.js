/**
 * @fileoverview Mentor Profile Repository
 * @description Direct database access layer mapping all operations to the MentorProfile Mongoose model.
 */

const MentorProfile = require("../models/MentorProfile");

const INDUSTRY_STATS_LIMIT = 12;

/**
 * Aggregates mentor registration volumes grouped by industry sectors.
 * @returns {Promise<Array<Object>>}
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
 * @param {Array<string>} userIds
 * @returns {Promise<Array<Object>>}
 */
const findMentorProfilesByUserIds = (userIds) =>
  MentorProfile.find({ user: { $in: userIds } })
    .select("user isProfileComplete isProfilePublished")
    .lean();

/**
 * Find an isolated lean mentor profile document linked to a specific user ID.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findMentorProfileByUserId = (userId) =>
  MentorProfile.findOne({ user: userId }).lean();

/**
 * Hard-delete a targeted mentor profile mapping matching a specific user ID.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const deleteMentorProfileByUserId = (userId) =>
  MentorProfile.findOneAndDelete({ user: userId });

/**
 * Retrieve all mentor profile entries including populated user details.
 * @returns {Promise<Array<Object>>}
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
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const findMentorProfileById = (id) =>
  MentorProfile.findById(id).populate("user", "name email createdAt").lean();

/**
 * Find a live mutable Mongoose mentor profile entity tracking document by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
const findMentorProfileByIdWithUser = (id) =>
  MentorProfile.findById(id).populate("user", "name email");

/**
 * Find a live mutable Mongoose mentor profile document by the owner's user ID.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findMentorProfileByUserIdWithUser = (userId) =>
  MentorProfile.findOne({ user: userId }).populate(
    "user",
    "name email isEmailVerified",
  );

/**
 * Finds a published mentor public profile with basic user info population.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findPublishedByUserId = (userId) =>
  MentorProfile.findOne({
    user: userId,
    isProfilePublished: true,
  }).populate("user", "name email");

/**
 * Creates and persists a new mentor profile document.
 * @param {Object} profileData
 * @returns {Promise<MentorProfile>}
 */
const create = (profileData) => {
  return MentorProfile.create(profileData);
};

/**
 * Atomic find and update operational query execution wrapper.
 * @param {string} userId
 * @param {Object} updateData
 * @returns {Promise<Object|null>}
 */
const findOneAndUpdateByUserId = (userId, updateData) => {
  return MentorProfile.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, runValidators: true },
  );
};

/**
 * Persist updates directly executed upon an active, tracked mentor profile document instance.
 * @param {Object} profile
 * @returns {Promise<Object>}
 */
const saveMentorProfile = (profile) => profile.save();

/**
 * Retrieve basic biographical summary properties linked to a single mentor user ID.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findMentorProfile = (userId) =>
  MentorProfile.findOne({ user: userId })
    .select(
      "currentRole company profilePicture skills hourlyRate avgRating bio",
    )
    .lean();

/**
 * Retrieve comprehensive structural details linked to a single mentor user ID.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findMentorProfileFull = (userId) =>
  MentorProfile.findOne({ user: userId })
    .select(
      "currentRole company industry bio hourlyRate avgRating yearsOfExperience profilePicture skills",
    )
    .lean();

/**
 * Query detailed informational properties mapped for isolated mentor display panels.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findMentorProfileForDetail = (userId) =>
  MentorProfile.findOne({ user: userId })
    .select(
      "currentRole company profilePicture skills hourlyRate avgRating bio",
    )
    .lean();

/**
 * Retrieve explicit performance evaluation parameters linked to a mentor user ID.
 * @param {string} userId
 * @returns {Promise<Object|null>}
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
    { new: true },
  );
};

/**
 * Finds potential alternative mentors sharing matching skills clusters.
 * @param {string} excludeUserId - User ID of the initiating mentor to filter out.
 * @param {Array<string>} skills - Array of strings matching target skill domains.
 * @param {number} limit - Maximum number of documents to return.
 * @returns {Promise<Array<Object>>} Lean array containing candidate profiles.
 */
const findSimilarPublishedMentors = (excludeUserId, skills, limit) => {
  return MentorProfile.find({
    user: { $ne: excludeUserId },
    isProfilePublished: true,
    isProfileComplete: true,
    skills: { $in: skills },
  })
    .populate("user", "name email")
    .select("user currentRole company skills profilePicture avgRating industry hourlyRate")
    .limit(limit)
    .lean();
};

/**
 * Executes a unified aggregation pipeline on the MentorProfile collection.
 * @param {Array<Object>} pipeline - Compiled aggregation pipeline stages.
 * @returns {Promise<Array<Object>>} Aggregation dataset results array.
 */
const aggregateMentorProfiles = (pipeline) => {
  return MentorProfile.aggregate(pipeline);
};

/**
 * Counts total documents in the MentorProfile collection matching a filter.
 * @param {Object} filter - Query criteria filter conditions map.
 * @returns {Promise<number>} Quantified total count.
 */
const countMentorProfiles = (filter) => {
  return MentorProfile.countDocuments(filter);
};

/**
 * Performs a standard find operation with full user profiles population and criteria indexing.
 * @param {Object} filter - Query selection criteria filters.
 * @param {Object} sort - Sorting directions criteria map configuration.
 * @param {number} skip - Offset skip record counter.
 * @param {number} limit - Hard limit capacity constraint criteria parameter.
 * @returns {Promise<Array<Object>>} Hydrated flat lean data tracking representations array.
 */
const findMentorsWithUserPopulation = (filter, sort, skip, limit) => {
  return MentorProfile.find(filter)
    .populate("user", "name email")
    .select("user currentRole industry company skills hourlyRate avgRating profilePicture linkedInUrl portfolioUrl yearsOfExperience bio verificationStatus")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};


module.exports = {
  getMentorIndustryStats,
  findMentorProfilesByUserIds,
  findMentorProfileByUserId,
  deleteMentorProfileByUserId,
  findAllMentorProfiles,
  findMentorProfileById,
  findMentorProfileByIdWithUser,
  findMentorProfileByUserIdWithUser,
  findPublishedByUserId,
  create,
  findOneAndUpdateByUserId,
  saveMentorProfile,
  findMentorProfile,
  findMentorProfileFull,
  findMentorProfileForDetail,
  findMentorRating,
  updateAvgRating,
  findSimilarPublishedMentors,
  aggregateMentorProfiles,
  countMentorProfiles,
  findMentorsWithUserPopulation,
};
