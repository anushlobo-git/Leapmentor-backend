/**
 * @fileoverview Admin Mentor Verification Controller
 * @description  Thin request/response handlers for evaluating, approving, and revoking 
 * mentor identity verification applications.
 */

const catchAsync = require("../utils/catchAsync");
const {
  getAllMentorVerificationsService,
  getMentorVerificationByIdService,
  verifyMentorService,
  revokeMentorVerificationService,
} = require("../services/admin.verification.service");

/**
 * Fetch all pending and processed mentor verification requests.
 * @route   GET /api/v1/admin/mentor-verifications
 * @access  Private (Admin)
 */
const getAllMentorVerifications = catchAsync(async (req, res) => {
  const mentors = await getAllMentorVerificationsService();
  res.status(200).json({ success: true, mentors, total: mentors.length });
});

/**
 * Retrieve details of an isolated mentor verification profile.
 * @route   GET /api/v1/admin/mentor-verifications/:mentorProfileId
 * @access  Private (Admin)
 */
const getMentorVerificationById = catchAsync(async (req, res) => {
  const result = await getMentorVerificationByIdService(req.params.mentorProfileId);
  res.status(200).json({ success: true, ...result });
});

/**
 * Approve and verify a mentor profile submission.
 * @route   PATCH /api/v1/admin/mentor-verifications/:mentorProfileId/verify
 * @access  Private (Admin)
 */
const verifyMentor = catchAsync(async (req, res) => {
  const result = await verifyMentorService(req.params.mentorProfileId);
  
  res.status(200).json({
    success: true,
    message: `${result.mentorName || "Mentor"} has been verified successfully`,
    mentorProfileId: result.mentorProfileId,
    verificationStatus: result.verificationStatus,
  });
});

/**
 * Revoke an existing verification status from a mentor profile.
 * @route   PATCH /api/v1/admin/mentor-verifications/:mentorProfileId/revoke
 * @access  Private (Admin)
 */
const revokeMentorVerification = catchAsync(async (req, res) => {
  const result = await revokeMentorVerificationService(req.params.mentorProfileId);
  
  res.status(200).json({
    success: true,
    message: `Verification revoked for ${result.mentorName || "mentor"}`,
    mentorProfileId: result.mentorProfileId,
    verificationStatus: result.verificationStatus,
  });
});

module.exports = {
  getAllMentorVerifications,
  getMentorVerificationById,
  verifyMentor,
  revokeMentorVerification,
};