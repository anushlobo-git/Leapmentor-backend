/**
 * @fileoverview Mentee Profile Controller
 * @description Clear transport processing gateway mapping endpoints into background profile engine services.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess, STATUS } = require("../utils/apiResponse");

const createMenteeProfileController = ({ menteeProfileService }) => {
  const createProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.createProfile(
      req.user._id,
      req.body,
    );
    return sendSuccess(
      res,
      { profile },
      "Mentee profile created successfully",
      STATUS.CREATED,
    );
  });

  const getMyProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.getMyProfile(req.user._id);
    return sendSuccess(res, profile, "Mentee profile retrieved");
  });

  const updateProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.updateMyProfile(
      req.user._id,
      req.body,
    );
    return sendSuccess(res, { profile }, "Profile updated successfully");
  });

  const getPublicProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.getPublicProfile(req.params.id);
    return sendSuccess(res, profile, "Mentee profile retrieved");
  });

  return {
    createProfile,
    getMyProfile,
    updateProfile,
    getPublicProfile,
  };
};

module.exports = createMenteeProfileController;
