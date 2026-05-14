const {
  findAllMentorProfiles,
  findMentorProfileById,
  findMentorProfileByIdWithUser,
  saveMentorProfile,
} = require("../repositories/mentor.repository");
const { sendMentorVerifiedEmail } = require("../utils/sendNotificationEmail");

const getAllMentorVerificationsService = async () => {
  const mentorProfiles = await findAllMentorProfiles();
  return mentorProfiles.map((profile) => ({
    user: profile.user,
    mentorProfile: { ...profile, user: undefined },
  }));
};

const getMentorVerificationByIdService = async (mentorProfileId) => {
  const profile = await findMentorProfileById(mentorProfileId);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");

  return {
    user: profile.user,
    mentorProfile: { ...profile, user: undefined },
  };
};

const verifyMentorService = async (mentorProfileId) => {
  const profile = await findMentorProfileByIdWithUser(mentorProfileId);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  if (profile.verificationStatus === "verified")
    throw new Error("ALREADY_VERIFIED");

  profile.verificationStatus = "verified";
  await saveMentorProfile(profile);

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
  const profile = await findMentorProfileByIdWithUser(mentorProfileId);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  if (profile.verificationStatus === "unverified")
    throw new Error("ALREADY_UNVERIFIED");

  profile.verificationStatus = "unverified";
  await saveMentorProfile(profile);

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
