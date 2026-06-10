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

// Configured Status Strings
const STATUS_VERIFIED = "verified";
const STATUS_UNVERIFIED = "unverified";

/**
 * Retrieves all available mentor application profiles for review.
 * @returns {Promise<Array<Object>>} List of normalized objects containing partitioned user and profile metadata.
 */
const getAllMentorVerificationsService = async () => {
  const mentorProfiles = await findAllMentorProfiles();
  return mentorProfiles.map((profile) => ({
    user: profile.user,
    mentorProfile: { ...profile, user: undefined },
  }));
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

  return {
    user: profile.user,
    mentorProfile: { ...profile, user: undefined },
  };
};

/**
 * Approves and verifies a submitted mentor profile application.
 * @description Validates the existence of the application, checks for redundant verification states,
 * marks the profile status as verified, updates the database, and dispatches an asynchronous notification email.
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

  sendMentorVerifiedEmail({
    mentorName: profile.user.name,
    mentorEmail: profile.user.email,
  }).catch((err) =>
    console.error("sendMentorVerifiedEmail failed:", err.message),
  );

  return {
    mentorProfileId: profile._id,
    verificationStatus: profile.verificationStatus,
    mentorName: profile.user?.name,
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
    mentorName: profile.user?.name,
  };
};

module.exports = {
  getAllMentorVerificationsService,
  getMentorVerificationByIdService,
  verifyMentorService,
  revokeMentorVerificationService,
};
