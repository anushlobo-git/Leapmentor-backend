/**
 * @fileoverview Mentor Profile Service
 * @description Pure business logic managing onboarding validations, parameter mutations, and visibility lookups.
 */

const AppError = require("../utils/AppError");
const mentorProfileRepository = require("../repositories/mentor.repository");

// Mappers
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");

// Upper-case Domain Constants
const DEFAULT_YEARS_OF_EXPERIENCE = 0;
const DEFAULT_HOURLY_RATE = 0;
const DEFAULT_LANGUAGES = ["English"];

/**
 * Provisions a new mentor profile record during user onboarding form submission.
 * @param {string} userId - Root context identifier key linking the account.
 * @param {Object} data - Profile input attributes collection payload.
 * @throws {AppError} 409 - If a mentor profile has already been generated for this user.
 * @returns {Promise<Object>} Created profile data payload structure.
 */
const createProfile = async (userId, data) => {
  const existing =
    await mentorProfileRepository.findMentorProfileByUserId(userId);
  if (existing) {
    throw new AppError("Profile already exists. Use update instead.", 409);
  }

  const profile = await mentorProfileRepository.create({
    user: userId,
    currentRole: data.currentRole,
    industry: data.industry,
    company: data.company,
    bio: data.bio,
    profilePicture: data.profilePicture || "",
    yearsOfExperience: data.yearsOfExperience || DEFAULT_YEARS_OF_EXPERIENCE,
    hourlyRate: data.hourlyRate || DEFAULT_HOURLY_RATE,
    skills: data.skills || [],
    communicationPreferences: data.communicationPreferences || [],
    languages: data.languages || DEFAULT_LANGUAGES,
    linkedInUrl: data.linkedInUrl || "",
    portfolioUrl: data.portfolioUrl || "",
    isProfileComplete: true,
    isProfilePublished: true,
  });

  return toMentorProfileDTO(profile);
};

/**
 * Returns complete account background details tracking the logged-in profile context.
 * @param {string} userId - Requesting context trace pointer identity credentials token.
 * @throws {AppError} 404 - If the profile configuration maps to a non-existent state.
 * @returns {Promise<Object>} Synced core biographical dataset mapping layout.
 */
const getMyProfile = async (userId) => {
  const profile =
    await mentorProfileRepository.findMentorProfileByUserIdWithUser(userId);
  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  return toMentorProfileDTO(profile);
};

/**
 * Mutates specific properties inside the profile collection records layout.
 * @param {string} userId - Acting modifier validation signature pointer tracking user passport credentials.
 * @param {Object} updateData - Modifiable attribute parameters map data keys block payload.
 * @throws {AppError} 404 - If profile mapping context reference targets missing index frames.
 * @returns {Promise<Object>} Mutated updated document execution properties context structure maps.
 */
const updateMyProfile = async (userId, updateData) => {
  const profile = await mentorProfileRepository.findOneAndUpdateByUserId(
    userId,
    updateData,
  );
  if (!profile) {
    throw new AppError("Profile not found", 404);
  }

  return toMentorProfileDTO(profile);
};

/**
 * Exposes a generic public schema dataset layout tracking publicly queryable parameters data.
 * @param {string} targetUserId - Targeted target profile entity context tracker database reference.
 * @throws {AppError} 404 - If matching parameters fail query availability criteria thresholds.
 * @returns {Promise<Object>} Immutable profile data results summary tracker sheet properties.
 */
const getPublicProfile = async (targetUserId) => {
  const profile =
    await mentorProfileRepository.findPublishedByUserId(targetUserId);
  if (!profile) {
    throw new AppError("Mentor profile not found", 404);
  }

  return toMentorProfileDTO(profile);
};

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
};
