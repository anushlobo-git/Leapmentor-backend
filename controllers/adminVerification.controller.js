// controllers/adminVerification.controller.js
const {
  getAllMentorVerificationsService,
  getMentorVerificationByIdService,
  verifyMentorService,
  revokeMentorVerificationService,
} = require("../services/admin.verification.service");

const getAllMentorVerifications = async (req, res) => {
  try {
    const mentors = await getAllMentorVerificationsService();
    return res.status(200).json({ mentors, total: mentors.length });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to fetch mentor verifications" });
  }
};

const getMentorVerificationById = async (req, res) => {
  try {
    const result = await getMentorVerificationByIdService(
      req.params.mentorProfileId,
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.message === "PROFILE_NOT_FOUND")
      return res.status(404).json({ message: "Mentor profile not found" });
    return res.status(500).json({ message: "Failed to fetch mentor profile" });
  }
};

const verifyMentor = async (req, res) => {
  try {
    const result = await verifyMentorService(req.params.mentorProfileId);
    return res.status(200).json({
      message: `${result.mentorName || "Mentor"} has been verified successfully`,
      mentorProfileId: result.mentorProfileId,
      verificationStatus: result.verificationStatus,
    });
  } catch (err) {
    if (err.message === "PROFILE_NOT_FOUND")
      return res.status(404).json({ message: "Mentor profile not found" });
    if (err.message === "ALREADY_VERIFIED")
      return res.status(400).json({ message: "Mentor is already verified" });
    return res.status(500).json({ message: "Failed to verify mentor" });
  }
};

const revokeMentorVerification = async (req, res) => {
  try {
    const result = await revokeMentorVerificationService(
      req.params.mentorProfileId,
    );
    return res.status(200).json({
      message: `Verification revoked for ${result.mentorName || "mentor"}`,
      mentorProfileId: result.mentorProfileId,
      verificationStatus: result.verificationStatus,
    });
  } catch (err) {
    if (err.message === "PROFILE_NOT_FOUND")
      return res.status(404).json({ message: "Mentor profile not found" });
    if (err.message === "ALREADY_UNVERIFIED")
      return res.status(400).json({ message: "Mentor is already unverified" });
    return res.status(500).json({ message: "Failed to revoke verification" });
  }
};

module.exports = {
  getAllMentorVerifications,
  getMentorVerificationById,
  verifyMentor,
  revokeMentorVerification,
};
