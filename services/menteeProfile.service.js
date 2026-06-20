/**
 * @fileoverview Mentee Profile Service
 * @description Pure business logic managing onboarding forms creation rules, permissions validation updates, and visibility lookups.
 */
const AppError = require("../utils/AppError");
const menteeProfileRepository = require("../repositories/mentee.repository");

// Upper-case Domain Constants
const DEFAULT_YEARS_OF_EXPERIENCE = 0;
const DEFAULT_LANGUAGES = ["English"];

/**
 * Provisions a new mentee profile record during user onboarding.
 * @param {string} userId - Root context identifier key linking account.
 * @param {Object} data - Profile input attributes collection.
 * @throws {AppError} 409 - If an onboarding profile has already been generated.
 * @returns {Promise<Object>} Created profile data payload.
 */
const createProfile = async (userId, data) => {
  const existing = await menteeProfileRepository.findByUserId(userId);
  if (existing) {
    throw new AppError("Profile already exists. Use update instead.", 409);
  }

  return await menteeProfileRepository.create({
    user: userId,
    currentRole: data.currentRole,
    industry: data.industry,
    company: data.company,
    yearsOfExperience: data.yearsOfExperience || DEFAULT_YEARS_OF_EXPERIENCE,
    bio: data.bio,
    profilePicture: data.profilePicture || "",
    linkedInUrl: data.linkedInUrl || "",
    portfolioUrl: data.portfolioUrl || "",
    skills: data.skills || [],
    interestedFields: data.interestedFields || [],
    communicationPreferences: data.communicationPreferences || [],
    languages: data.languages || DEFAULT_LANGUAGES,
    isProfileComplete: true,
    isProfilePublished: true,
  });
};

/**
 * Returns complete account and background details tracking the logged in profile.
 * @param {string} userId - Requesting context trace pointer identity.
 * @throws {AppError} 404 - If profile record matches to non-existent state.
 * @returns {Promise<Object>} Synced core and operational account properties mapping.
 */
const getMyProfile = async (userId) => {
  const profile =
    await menteeProfileRepository.findByUserIdWithAccountInfo(userId);
  if (!profile) {
    throw new AppError("Profile not found", 404);
  }
  return profile;
};

/**
 * Mutates structural data fields matching the user background data layout sheets.
 * @param {string} userId - Acting modifier validation signature pointer tracking passport credentials.
 * @param {Object} updateData - Modifiable attribute parameters map data keys block payload.
 * @throws {AppError} 404 - If profile mapping context reference targets missing index frames.
 * @returns {Promise<Object>} Mutated updated document execution properties context structure maps.
 */
const updateMyProfile = async (userId, updateData) => {
  const profile = await menteeProfileRepository.findOneAndUpdateByUserId(
    userId,
    updateData,
  );
  if (!profile) {
    throw new AppError("Profile not found", 404);
  }
  return profile;
};

/**
 * Exposes a generic schema dataset layout tracking publicly queryable parameters data.
 * @param {string} targetUserId - Targeted target profile entity context.
 * @throws {AppError} 404 - If matching parameters fail query criteria thresholds.
 * @returns {Promise<Object>} Immutable profile data results summary tracker sheet properties.
 */
const getPublicProfile = async (targetUserId) => {
  const profile =
    await menteeProfileRepository.findPublishedByUserId(targetUserId);
  if (!profile) {
    throw new AppError("Mentee profile not found", 404);
  }
  return profile;
};

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
};
