/**
 * @fileoverview Mentee Profile Controller
 * @description Clear transport processing gateway mapping endpoint calls into background profile engine services.
 */
const catchAsync = require("../utils/catchAsync");
const menteeProfileService = require("../services/menteeProfile.service");

/**
 * Processes incoming profile parameters creating fresh onboarding records.
 * @route   POST /api/v1/mentee-profile
 * @access  Private (Mentee Only)
 */
const createProfile = catchAsync(async (req, res) => {
  const profile = await menteeProfileService.createProfile(
    req.user._id,
    req.body,
  );

  res.status(201).json({
    message: "Mentee profile created successfully",
    profile,
  });
});

/**
 * Exposes the full user mapping dataset matching logged-in account tokens.
 * @route   GET /api/v1/mentee-profile/me
 * @access  Private (Mentee Only)
 */
const getMyProfile = catchAsync(async (req, res) => {
  const profile = await menteeProfileService.getMyProfile(req.user._id);
  res.status(200).json(profile);
});

/**
 * Captures request body segments rewriting target profile information elements.
 * @route   PUT /api/v1/mentee-profile/me
 * @access  Private (Mentee Only)
 */
const updateProfile = catchAsync(async (req, res) => {
  const profile = await menteeProfileService.updateMyProfile(
    req.user._id,
    req.body,
  );

  res.status(200).json({
    message: "Profile updated successfully",
    profile,
  });
});

/**
 * Returns public metadata layouts tracking targeted profiles indices.
 * @route   GET /api/v1/mentee-profile/:id
 * @access  Public
 */
const getPublicProfile = catchAsync(async (req, res) => {
  const profile = await menteeProfileService.getPublicProfile(req.params.id);
  res.status(200).json(profile);
});

module.exports = {
  createProfile,
  getMyProfile,
  updateProfile,
  getPublicProfile,
};
