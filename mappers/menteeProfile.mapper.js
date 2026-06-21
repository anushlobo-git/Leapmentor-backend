/**
 * @fileoverview Mentee Profile Data Transfer Object (DTO) Mapper
 * @description Decouples database document states from API payload objects.
 */

const toMenteeProfileDTO = (profile) => {
  if (!profile) return null;

  return {
    //  Dual-ID Support: Complete frontend backward compatibility
    _id: profile._id,
   

    // Safe extraction fallback paths handle either raw ObjectIds or populated structures completely uniformly
    user: profile.user?._id
      ? {
          id: profile.user._id.toString(),
          name: profile.user.name,
          email: profile.user.email,
          isEmailVerified: profile.user.isEmailVerified,
        }
      : profile.user,

    currentRole: profile.currentRole || "",
    industry: profile.industry || "",
    company: profile.company || "",
    yearsOfExperience: profile.yearsOfExperience || "",
    bio: profile.bio || "",
    profilePicture: profile.profilePicture || "",
    linkedInUrl: profile.linkedInUrl || "",
    portfolioUrl: profile.portfolioUrl || "",
    skills: profile.skills || [],
    interestedFields: profile.interestedFields || [],
    communicationPreferences: profile.communicationPreferences || [],
    languages: profile.languages || ["English"],
    isProfileComplete: profile.isProfileComplete || false,
    isProfilePublished: profile.isProfilePublished || false,
    emailNotifications: profile.emailNotifications !== false,
    marketingPreferences: profile.marketingPreferences || false,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

module.exports = { toMenteeProfileDTO };
