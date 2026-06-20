/**
 * @fileoverview Mentor Referral Service
 * @description Evaluates skill alignment matrices and calculates peer match scores for request re-routing.
 */

const AppError = require("../utils/AppError");
const connectRequestRepository = require("../repositories/connectRequest.repository");
const mentorRepository = require("../repositories/mentor.repository");

// Mappers
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");

// Upper-case Domain Constants
const SIMILAR_MENTORS_SEARCH_LIMIT = 20;

/**
 * Resolves a ranked, matching collection of active alternative mentors who share professional skill attributes.
 * @description Validates target connection requests existence, checks executing mentor privileges,
 * reads baseline skill tags, performs multi-attribute set ranking, and sorts candidates.
 * @param {string} connectRequestId - Core connection reference tracking identity.
 * @param {string} currentUserId - Initiating advisor account credential context mapping.
 * @throws {AppError} 403 - If the caller is not the assigned recipient of the connection request.
 * @throws {AppError} 404 - If the target connection block is missing from database sheets.
 * @returns {Promise<Object>} Object containing the scored candidates list and baseline skill parameters.
 */
const getSimilarMentorsList = async (connectRequestId, currentUserId) => {
  const request =
    await connectRequestRepository.findByIdWithMentorId(connectRequestId);
  if (!request) {
    throw new AppError("Request not found", 404);
  }

  if (request.mentor.toString() !== currentUserId.toString()) {
    throw new AppError(
      "Not authorized to look up alternatives for this connection contract",
      403,
    );
  }

  const myProfile =
    await mentorRepository.findMentorProfileByUserId(currentUserId);
  if (!myProfile || !myProfile.skills || myProfile.skills.length === 0) {
    return { mentors: [], mySkills: [] };
  }

  const similarMentors = await mentorRepository.findSimilarPublishedMentors(
    currentUserId,
    myProfile.skills,
    SIMILAR_MENTORS_SEARCH_LIMIT,
  );

  const targetSkillsSet = new Set(
    myProfile.skills.map((skill) => skill.toLowerCase()),
  );

  const rankedMentors = similarMentors.map((mentor) => {
    const matchCount = mentor.skills.filter((skill) =>
      targetSkillsSet.has(skill.toLowerCase()),
    ).length;

    // ✅ Wrap the profile properties into the DTO layer while embedding the dynamic alignment score
    return {
      ...toMentorProfileDTO(mentor),
      matchCount,
    };
  });

  rankedMentors.sort(
    (firstCandidate, secondCandidate) =>
      secondCandidate.matchCount - firstCandidate.matchCount,
  );

  return {
    mentors: rankedMentors,
    mySkills: myProfile.skills,
  };
};

module.exports = {
  getSimilarMentorsList,
};
