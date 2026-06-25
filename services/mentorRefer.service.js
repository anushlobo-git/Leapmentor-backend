/**
 * @fileoverview Mentor Referral Service
 * @description Evaluates skill alignment matrices and calculates peer match scores
 * for request re-routing via parameter dependency injection.
 */

const AppError = require("../utils/AppError");
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");

const SIMILAR_MENTORS_SEARCH_LIMIT = 20;

const createMentorReferService = (
  connectRequestRepository,
  mentorProfileRepository,
) => {
  /**
   * Resolves a ranked, matching collection of active alternative mentors who share professional skill attributes.
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
      await mentorProfileRepository.findMentorProfileByUserId(currentUserId);
    if (!myProfile?.skills?.length) {
      return { mentors: [], mySkills: [] };
    }

    const similarMentors =
      await mentorProfileRepository.findSimilarPublishedMentors(
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

  return { getSimilarMentorsList };
};

module.exports = createMentorReferService;
