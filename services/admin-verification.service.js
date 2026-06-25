/**
 * @fileoverview Admin Mentor Verification Service
 * @description Business logic for auditing, approving, and revoking mentor application verifications.
 * Completely decoupled from concrete infrastructure tools using parameter inversion patterns.
 */

const AppError = require("../utils/AppError");
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");

const STATUS_VERIFIED = "verified";
const STATUS_UNVERIFIED = "unverified";

const createAdminVerificationService = (
  mentorProfileRepository,
  fireAndForgetEmail,
  sendMentorVerifiedEmail,
) => {
  /**
   * Retrieves all available mentor application profiles for review.
   */
  const getAllMentorVerificationsService = async () => {
    const mentorProfiles =
      await mentorProfileRepository.findAllMentorProfiles();

    return mentorProfiles.map((profile) => {
      const mapped = toMentorProfileDTO(profile);
      return {
        user: mapped.user,
        mentorProfile: { ...mapped, user: undefined },
      };
    });
  };

  /**
   * Retrieves an isolated mentor profile by its identifier for application auditing.
   */
  const getMentorVerificationByIdService = async (mentorProfileId) => {
    const profile =
      await mentorProfileRepository.findMentorProfileById(mentorProfileId);
    if (!profile) {
      throw new AppError("Mentor profile not found.", 404);
    }

    const mapped = toMentorProfileDTO(profile);
    return {
      user: mapped.user,
      mentorProfile: { ...mapped, user: undefined },
    };
  };

  /**
   * Approves and verifies a submitted mentor profile application.
   */
  const verifyMentorService = async (mentorProfileId) => {
    const profile =
      await mentorProfileRepository.findMentorProfileByIdWithUser(
        mentorProfileId,
      );
    if (!profile) {
      throw new AppError("Mentor profile not found.", 404);
    }

    if (profile.verificationStatus === STATUS_VERIFIED) {
      throw new AppError("Mentor is already verified.", 400);
    }

    profile.verificationStatus = STATUS_VERIFIED;
    await mentorProfileRepository.saveMentorProfile(profile);

    const mentorName = profile.user?.name || "Mentor";
    const mentorEmail = profile.user?.email;

    if (mentorEmail) {
      fireAndForgetEmail(
        () => sendMentorVerifiedEmail({ mentorName, mentorEmail }),
        "Mentor Application Approval Verification",
      );
    }

    return {
      mentorProfileId: profile._id,
      verificationStatus: profile.verificationStatus,
      mentorName,
    };
  };

  /**
   * Revokes an active verification credential status from a mentor profile.
   */
  const revokeMentorVerificationService = async (mentorProfileId) => {
    const profile =
      await mentorProfileRepository.findMentorProfileByIdWithUser(
        mentorProfileId,
      );
    if (!profile) {
      throw new AppError("Mentor profile not found.", 404);
    }

    if (profile.verificationStatus === STATUS_UNVERIFIED) {
      throw new AppError("Mentor is already unverified.", 400);
    }

    profile.verificationStatus = STATUS_UNVERIFIED;
    await mentorProfileRepository.saveMentorProfile(profile);

    return {
      mentorProfileId: profile._id,
      verificationStatus: profile.verificationStatus,
      mentorName: profile.user?.name || "Mentor",
    };
  };

  return {
    getAllMentorVerificationsService,
    getMentorVerificationByIdService,
    verifyMentorService,
    revokeMentorVerificationService,
  };
};

module.exports = createAdminVerificationService;
