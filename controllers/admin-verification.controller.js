/**
 * @fileoverview Admin Mentor Verification Controller
 * @description Coordinates incoming verification payload formatting,
 * leveraging dynamic Cache-Aside structures to accelerate lookups.
 */

const catchAsync = require("../utils/catchAsync");

const CACHE_TTL_SECONDS = 300; // 5-Minute corporate caching window
const LIST_CACHE_KEY = "admin:verifications:master-list";
const DETAIL_CACHE_KEY = "admin:verifications:profile-detail";

const createAdminVerificationController = (
  adminVerificationService,
  cacheUtility,
) => {
  const getAllMentorVerifications = catchAsync(async (req, res) => {
    const mentors = await cacheUtility.getOrSetCache(
      LIST_CACHE_KEY,
      CACHE_TTL_SECONDS,
      () => adminVerificationService.getAllMentorVerificationsService(),
    );
    res.status(200).json({ success: true, mentors, total: mentors.length });
  });

  const getMentorVerificationById = catchAsync(async (req, res) => {
    const { mentorProfileId } = req.params;
    const data = await cacheUtility.getOrSetCache(
      `${DETAIL_CACHE_KEY}:${mentorProfileId}`,
      CACHE_TTL_SECONDS,
      () =>
        adminVerificationService.getMentorVerificationByIdService(
          mentorProfileId,
        ),
    );
    res.status(200).json({ success: true, ...data });
  });

  const verifyMentor = catchAsync(async (req, res) => {
    const { mentorProfileId } = req.params;
    const result =
      await adminVerificationService.verifyMentorService(mentorProfileId);

    // Invalidate master list and individual profiles from memory instantly
    await cacheUtility.evictCache?.(LIST_CACHE_KEY);
    await cacheUtility.evictCache?.(`${DETAIL_CACHE_KEY}:${mentorProfileId}`);

    res.status(200).json({
      success: true,
      message: `${result.mentorName || "Mentor"} has been verified successfully`,
      mentorProfileId: result.mentorProfileId,
      verificationStatus: result.verificationStatus,
    });
  });

  const revokeMentorVerification = catchAsync(async (req, res) => {
    const { mentorProfileId } = req.params;
    const result =
      await adminVerificationService.revokeMentorVerificationService(
        mentorProfileId,
      );

    // Invalidate master list and individual profiles from memory instantly
    await cacheUtility.evictCache?.(LIST_CACHE_KEY);
    await cacheUtility.evictCache?.(`${DETAIL_CACHE_KEY}:${mentorProfileId}`);

    res.status(200).json({
      success: true,
      message: `Verification revoked for ${result.mentorName || "mentor"}`,
      mentorProfileId: result.mentorProfileId,
      verificationStatus: result.verificationStatus,
    });
  });

  return {
    getAllMentorVerifications,
    getMentorVerificationById,
    verifyMentor,
    revokeMentorVerification,
  };
};

module.exports = createAdminVerificationController;
