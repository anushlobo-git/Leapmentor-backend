/**
 * @fileoverview Mentor Profile Controller
 * @description Clear network layer interface forwarding payloads straight to background profile engine services.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");

const createMentorProfileController = ({ mentorProfileService }) => {
  /**
   * Processes incoming profile parameters creating fresh onboarding records.
   * @route   POST /api/v1/mentor-profile
   * @access  Private (Mentor Only)
   */
  const createProfile = catchAsync(async (req, res, next) => {
    const profile = await mentorProfileService.createProfile(
      req.user._id,
      req.body,
    );
    return sendSuccess(
      res,
      { profile },
      "Mentor profile created successfully",
      STATUS.CREATED,
    );
  });

  /**
   * Exposes the full user mapping dataset matching logged-in account tokens.
   * @route   GET /api/v1/mentor-profile/me
   * @access  Private (Mentor Only)
   */
  const getMyProfile = catchAsync(async (req, res, next) => {
    const profile = await mentorProfileService.getMyProfile(req.user._id);
    return sendSuccess(res, profile, "Mentor profile retrieved");
  });

  /**
   * Captures request body segments rewriting target profile information elements.
   * @route   PUT /api/v1/mentor-profile/me
   * @access  Private (Mentor Only)
   */
  const updateProfile = catchAsync(async (req, res, next) => {
    const profile = await mentorProfileService.updateMyProfile(
      req.user._id,
      req.body,
    );
    return sendSuccess(res, { profile }, "Profile updated successfully");
  });

  /**
   * Returns public metadata layouts tracking targeted profiles indices.
   * @route   GET /api/v1/mentor-profile/:id
   * @access  Public
   */
  const getPublicProfile = catchAsync(async (req, res, next) => {
    const profile = await mentorProfileService.getPublicProfile(req.params.id);
    return sendSuccess(res, profile, "Mentor profile retrieved");
  });

  return {
    createProfile,
    getMyProfile,
    updateProfile,
    getPublicProfile,
  };
};

module.exports = createMentorProfileController;
