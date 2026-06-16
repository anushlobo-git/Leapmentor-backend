/**
 * @fileoverview Mentor Search Controller
 * @description Thin network transmission entry point processing query parameters and streaming JSON payloads cleanly.
 */
const catchAsync = require("../utils/catchAsync");
const mentorSearchService = require("../services/mentorSearch.service");

/**
 * Searches and filters across platform mentor registrations.
 * @route   GET /api/v1/mentors/search
 * @access  Private (Mentee Only)
 */
const searchMentors = catchAsync(async (req, res) => {
  const result = await mentorSearchService.queryMentors(req.query);
  res.status(200).json({
    success: true,
    ...result,
  });
});


module.exports = {
  searchMentors,
};
