/**
 * @fileoverview Mentor Referral Controller
 * @description Thin network interface intercepting route tokens and pushing down data to referral lookups.
 */

const catchAsync = require("../utils/catchAsync");
const mentorReferService = require("../services/mentorRefer.service");

/**
 * Resolves an aggregated list of alternative candidate mentors sharing relative domain strengths.
 * @route   GET /api/v1/connect-requests/:id/similar-mentors
 * @access  Private (Mentor Only)
 */
const getSimilarMentors = catchAsync(async (req, res) => {
  const result = await mentorReferService.getSimilarMentorsList(
    req.params.id,
    req.user._id,
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  getSimilarMentors,
};
