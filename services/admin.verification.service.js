/**
 * @fileoverview Admin Mentor Verification Service
 * @description  Business logic for auditing, approving, and revoking mentor application verifications.
 * Interfaces with mentor repositories and coordinates notification emails.
 */

const AppError = require("../utils/AppError");
const {
  findAllMentorProfiles,
  findMentorProfileById,
  findMentorProfileByIdWithUser,
  saveMentorProfile,
} = require("../repositories/mentor.repository");
const { sendMentorVerifiedEmail } = require("../utils/sendNotificationEmail");
const logger = require("../config/logger");
// Mappers
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");

// Configured Status Strings
const STATUS_VERIFIED = "verified";
const STATUS_UNVERIFIED = "unverified";

/**
 * Retrieves all available mentor application profiles for review.
 * @returns {Promise<Array<Object>>} List of normalized objects containing partitioned user and profile metadata.
 */
const getAllMentorVerificationsService = async () => {
  const mentorProfiles = await findAllMentorProfiles();

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
 * @param {string} mentorProfileId - Unique identifier of the target mentor profile.
 * @throws {AppError} 404          - If no profile matches the given identifier.
 * @returns {Promise<Object>} Object containing separated user and mentor profile configurations.
 */
const getMentorVerificationByIdService = async (mentorProfileId) => {
  const profile = await findMentorProfileById(mentorProfileId);
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
 * @param {string} mentorProfileId - Unique identifier of the target mentor profile.
 * @throws {AppError} 400          - If the profile application is already verified.
 * @throws {AppError} 404          - If the mentor profile is not found.
 * @returns {Promise<Object>} Execution confirmations detailing verification flags and mentor identifiers.
 */
const verifyMentorService = async (mentorProfileId) => {
  const profile = await findMentorProfileByIdWithUser(mentorProfileId);
  if (!profile) {
    throw new AppError("Mentor profile not found.", 404);
  }

  if (profile.verificationStatus === STATUS_VERIFIED) {
    throw new AppError("Mentor is already verified.", 400);
  }

  profile.verificationStatus = STATUS_VERIFIED;
  await saveMentorProfile(profile);

  const mentorName = profile.user?.name || "Mentor";
  const mentorEmail = profile.user?.email;

  if (mentorEmail) {
    sendMentorVerifiedEmail({
      mentorName,
      mentorEmail,
    }).catch((err) =>
      logger.error("sendMentorVerifiedEmail failed", { message: err.message }),
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
 * @param {string} mentorProfileId - Unique identifier of the target mentor profile.
 * @throws {AppError} 400          - If the target profile is already unverified.
 * @throws {AppError} 404          - If the mentor profile is not found.
 * @returns {Promise<Object>} Execution confirmations detailing revoked status flags and mentor identifiers.
 */
const revokeMentorVerificationService = async (mentorProfileId) => {
  const profile = await findMentorProfileByIdWithUser(mentorProfileId);
  if (!profile) {
    throw new AppError("Mentor profile not found.", 404);
  }

  if (profile.verificationStatus === STATUS_UNVERIFIED) {
    throw new AppError("Mentor is already unverified.", 400);
  }

  profile.verificationStatus = STATUS_UNVERIFIED;
  await saveMentorProfile(profile);

  return {
    mentorProfileId: profile._id,
    verificationStatus: profile.verificationStatus,
    mentorName: profile.user?.name || "Mentor",
  };
};

module.exports = {
  getAllMentorVerificationsService,
  getMentorVerificationByIdService,
  verifyMentorService,
  revokeMentorVerificationService,
};
