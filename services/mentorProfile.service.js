/**
 * @fileoverview Mentor Profile Service
 * @description Pure business logic managing onboarding validations, parameter mutations,
 * and visibility lookups via parameter dependency injection.
 */

const AppError = require("../utils/AppError");

// Upper-case Domain Constants
const DEFAULT_YEARS_OF_EXPERIENCE = 0;
const DEFAULT_HOURLY_RATE = 0;
const DEFAULT_LANGUAGES = ["English"];

const createMentorProfileService = ({
  mentorProfileRepository,
  toMentorProfileDTO,
}) => {
  /**
   * Provisions a new mentor profile record during user onboarding form submission.
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
      profilePictureFileName: data.profilePictureFileName || "",
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
   */
  const getPublicProfile = async (targetUserId) => {
    const profile =
      await mentorProfileRepository.findPublishedByUserId(targetUserId);
    if (!profile) {
      throw new AppError("Mentor profile not found", 404);
    }

    return toMentorProfileDTO(profile);
  };

  return {
    createProfile,
    getMyProfile,
    updateMyProfile,
    getPublicProfile,
  };
};

module.exports = createMentorProfileService;
