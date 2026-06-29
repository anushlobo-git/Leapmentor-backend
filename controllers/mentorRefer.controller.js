/**
 * @fileoverview Mentor Referral Controller
 * @description Inverted network interface intercepting route tokens and pushing
 * down data to referral lookups via dependency parameter injection.
 */

const catchAsync = require("../utils/catchAsync");

const createMentorReferController = ({ mentorReferService }) => {
  /**
   * Resolves an aggregated list of alternative candidate mentors sharing relative domain strengths.
   * @route   GET /api/v1/connect-requests/:id/similar-mentors
   * @access  Private (Mentor Only)
   */
  const getSimilarMentors = catchAsync(async (req, res, next) => {
    const result = await mentorReferService.getSimilarMentorsList(
      req.params.id,
      req.user._id,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  });

  return { getSimilarMentors };
};

module.exports = createMentorReferController;
