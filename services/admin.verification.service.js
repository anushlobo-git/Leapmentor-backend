// services/admin.verification.service.js
const MentorProfile = require("../models/MentorProfile");
const { sendMentorVerifiedEmail } = require("../utils/sendNotificationEmail");

const getAllMentorVerificationsService = async () => {
  const mentorProfiles = await MentorProfile.find({})
    .populate("user", "name email createdAt")
    .select(
      "user verificationStatus phoneNumber resumeDocument workExperienceDocuments " +
        "profilePicture bio skills currentRole company industry yearsOfExperience " +
        "languages averageRating totalSessions points",
    )
    .sort({ createdAt: -1 })
    .lean();

  return mentorProfiles.map((profile) => ({
    user: profile.user,
    mentorProfile: { ...profile, user: undefined },
  }));
};

const getMentorVerificationByIdService = async (mentorProfileId) => {
  const profile = await MentorProfile.findById(mentorProfileId)
    .populate("user", "name email createdAt")
    .lean();
  if (!profile) throw new Error("PROFILE_NOT_FOUND");

  return {
    user: profile.user,
    mentorProfile: { ...profile, user: undefined },
  };
};

const verifyMentorService = async (mentorProfileId) => {
  const profile = await MentorProfile.findById(mentorProfileId).populate(
    "user",
    "name email",
  );
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  if (profile.verificationStatus === "verified")
    throw new Error("ALREADY_VERIFIED");

  profile.verificationStatus = "verified";
  await profile.save();

  // email notification (non-blocking)
  sendMentorVerifiedEmail({
    mentorName: profile.user.name,
    mentorEmail: profile.user.email,
  }).catch((err) =>
    console.error("❌ sendMentorVerifiedEmail failed:", err.message),
  );

  return {
    mentorProfileId: profile._id,
    verificationStatus: profile.verificationStatus,
    mentorName: profile.user?.name,
  };
};

const revokeMentorVerificationService = async (mentorProfileId) => {
  const profile = await MentorProfile.findById(mentorProfileId).populate(
    "user",
    "name email",
  );
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  if (profile.verificationStatus === "unverified")
    throw new Error("ALREADY_UNVERIFIED");

  profile.verificationStatus = "unverified";
  await profile.save();

  return {
    mentorProfileId: profile._id,
    verificationStatus: profile.verificationStatus,
    mentorName: profile.user?.name,
  };
};

module.exports = {
  getAllMentorVerificationsService,
  getMentorVerificationByIdService,
  verifyMentorService,
  revokeMentorVerificationService,
};
