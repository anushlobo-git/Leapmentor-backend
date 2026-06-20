/**
 * @fileoverview Mentor Profile Controller
 * @description Clear network layer interface interface forwarding payloads straight to background profile engine services.
 */

const catchAsync = require("../utils/catchAsync");
const mentorProfileService = require("../services/mentorProfile.service");

/**
 * Processes incoming profile parameters creating fresh onboarding records.
 * @route   POST /api/v1/mentor-profile
 * @access  Private (Mentor Only)
 */
const createProfile = catchAsync(async (req, res) => {
  const profile = await mentorProfileService.createProfile(
    req.user._id,
    req.body,
  );

  res.status(201).json({
    message: "Mentor profile created successfully",
    profile,
  });
});

/**
 * Exposes the full user mapping dataset matching logged-in account tokens.
 * @route   GET /api/v1/mentor-profile/me
 * @access  Private (Mentor Only)
 */
const getMyProfile = catchAsync(async (req, res) => {
  const profile = await mentorProfileService.getMyProfile(req.user._id);
  res.status(200).json(profile);
});

/**
 * Captures request body segments rewriting target profile information elements.
 * @route   PUT /api/v1/mentor-profile/me
 * @access  Private (Mentor Only)
 */
const updateProfile = catchAsync(async (req, res) => {
  const profile = await mentorProfileService.updateMyProfile(
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
 * @route   GET /api/v1/mentor-profile/:id
 * @access  Public
 */
const getPublicProfile = catchAsync(async (req, res) => {
  const profile = await mentorProfileService.getPublicProfile(req.params.id);
  res.status(200).json(profile);
});

module.exports = {
  createProfile,
  getMyProfile,
  updateProfile,
  getPublicProfile,
};
