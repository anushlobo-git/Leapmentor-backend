/**
 * @fileoverview Mentee Profile Controller
 * @description Clear transport processing gateway mapping endpoints into background profile engine services.
 */

const catchAsync = require("../utils/catchAsync");

const createMenteeProfileController = (menteeProfileService) => {
  const createProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.createProfile(
      req.user._id,
      req.body,
    );
    return res.status(201).json({
      message: "Mentee profile created successfully",
      profile,
    });
  });

  const getMyProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.getMyProfile(req.user._id);
    return res.status(200).json(profile);
  });

  const updateProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.updateMyProfile(
      req.user._id,
      req.body,
    );
    return res.status(200).json({
      message: "Profile updated successfully",
      profile,
    });
  });

  const getPublicProfile = catchAsync(async (req, res, next) => {
    const profile = await menteeProfileService.getPublicProfile(req.params.id);
    return res.status(200).json(profile);
  });

  return {
    createProfile,
    getMyProfile,
    updateProfile,
    getPublicProfile,
  };
};

module.exports = createMenteeProfileController;
