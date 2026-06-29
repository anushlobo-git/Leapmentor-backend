/**
 * @fileoverview Mentee Profile Service
 * @description Pure business logic managing onboarding templates creation rules and lookups via injection.
 */

const AppError = require("../utils/AppError");
const { toMenteeProfileDTO } = require("../mappers/menteeProfile.mapper");

const DEFAULT_YEARS_OF_EXPERIENCE = 0;
const DEFAULT_LANGUAGES = ["English"];

const createMenteeProfileService = ({ menteeProfileRepository }) => {
  const createProfile = async (userId, data) => {
    const existing = await menteeProfileRepository.findByUserId(userId);
    if (existing) {
      throw new AppError("Profile already exists. Use update instead.", 409);
    }

    const profile = await menteeProfileRepository.create({
      user: userId,
      currentRole: data.currentRole,
      industry: data.industry,
      company: data.company,
      yearsOfExperience: data.yearsOfExperience || DEFAULT_YEARS_OF_EXPERIENCE,
      bio: data.bio,
      profilePicture: data.profilePicture || "",
      profilePictureFileName: data.profilePictureFileName || "",
      linkedInUrl: data.linkedInUrl || "",
      portfolioUrl: data.portfolioUrl || "",
      skills: data.skills || [],
      interestedFields: data.interestedFields || [],
      communicationPreferences: data.communicationPreferences || [],
      languages: data.languages || DEFAULT_LANGUAGES,
      isProfileComplete: true,
      isProfilePublished: true,
    });

    return toMenteeProfileDTO(profile);
  };

  const getMyProfile = async (userId) => {
    const profile =
      await menteeProfileRepository.findByUserIdWithAccountInfo(userId);
    if (!profile) {
      throw new AppError("Profile not found", 404);
    }
    return toMenteeProfileDTO(profile);
  };

  const updateMyProfile = async (userId, updateData) => {
    const profile = await menteeProfileRepository.findOneAndUpdateByUserId(
      userId,
      updateData,
    );
    if (!profile) {
      throw new AppError("Profile not found", 404);
    }
    return toMenteeProfileDTO(profile);
  };

  const getPublicProfile = async (targetUserId) => {
    const profile =
      await menteeProfileRepository.findPublishedByUserId(targetUserId);
    if (!profile) {
      throw new AppError("Mentee profile not found", 404);
    }
    return toMenteeProfileDTO(profile);
  };

  return {
    createProfile,
    getMyProfile,
    updateMyProfile,
    getPublicProfile,
  };
};

module.exports = createMenteeProfileService;
