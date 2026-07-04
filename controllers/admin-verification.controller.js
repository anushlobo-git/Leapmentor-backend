/**
 * @fileoverview Admin Mentor Verification Controller
 * @description Coordinates incoming verification payload formatting,
 * leveraging dynamic Cache-Aside structures to accelerate lookups.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");

const CACHE_TTL_SECONDS = 300; // 5-Minute corporate caching window
const LIST_CACHE_KEY = "admin:verifications:master-list";
const DETAIL_CACHE_KEY = "admin:verifications:profile-detail";

const createAdminVerificationController = ({ adminVerificationService, cacheUtility }) => {
  const getAllMentorVerifications = catchAsync(async (req, res) => {
    const mentors = await cacheUtility.getOrSetCache(
      LIST_CACHE_KEY,
      CACHE_TTL_SECONDS,
      () => adminVerificationService.getAllMentorVerificationsService(),
    );
    sendSuccess(res, { mentors, total: mentors.length }, "Mentor verifications retrieved");
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
    sendSuccess(res, data, "Mentor verification details retrieved");
  });

  const verifyMentor = catchAsync(async (req, res) => {
    const { mentorProfileId } = req.params;
    const result =
      await adminVerificationService.verifyMentorService(mentorProfileId);

    // Invalidate master list and individual profiles from memory instantly
    await cacheUtility.evictCache?.(LIST_CACHE_KEY);
    await cacheUtility.evictCache?.(`${DETAIL_CACHE_KEY}:${mentorProfileId}`);

    sendSuccess(
      res,
      {
        mentorProfileId: result.mentorProfileId,
        verificationStatus: result.verificationStatus,
      },
      `${result.mentorName || "Mentor"} has been verified successfully`,
    );
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

    sendSuccess(
      res,
      {
        mentorProfileId: result.mentorProfileId,
        verificationStatus: result.verificationStatus,
      },
      `Verification revoked for ${result.mentorName || "mentor"}`,
    );
  });

  return {
    getAllMentorVerifications,
    getMentorVerificationById,
    verifyMentor,
    revokeMentorVerification,
  };
};

module.exports = createAdminVerificationController;
