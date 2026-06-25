/**
 * @fileoverview Admin Statistics Service
 * @description Business logic for gathering, processing, and formatting platform telemetry
 * and growth metrics. Coordinates between user and mentor repositories via constructor injection.
 */

// Configurations
const GROWTH_LOOKBACK_DAYS = 90;

const createAdminStatsService = (userRepository, mentorProfileRepository) => {
  /**
   * Computes platform-wide baseline user totals and rolling monthly aggregates.
   * @returns {Promise<Object>} High-level total metrics and current month registration counts.
   */
  const getStatsService = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalMentors,
      totalMentees,
      newUsersThisMonth,
      newMentorsThisMonth,
      newMenteesThisMonth,
    ] = await Promise.all([
      userRepository.countUsersWithOptions({}),
      userRepository.countUsersWithOptions({ roles: "mentor" }),
      userRepository.countUsersWithOptions({ roles: "mentee" }),
      userRepository.countUsersWithOptions({
        createdAt: { $gte: startOfMonth },
      }),
      userRepository.countUsersWithOptions({
        roles: "mentor",
        createdAt: { $gte: startOfMonth },
      }),
      userRepository.countUsersWithOptions({
        roles: "mentee",
        createdAt: { $gte: startOfMonth },
      }),
    ]);

    return {
      totalUsers,
      totalMentors,
      totalMentees,
      newUsersThisMonth,
      newMentorsThisMonth,
      newMenteesThisMonth,
    };
  };

  /**
   * Accumulates daily user registration trends for chart visualization.
   * @returns {Promise<Array<Object>>} Formatted timeline array containing localized dates and counts.
   */
  const getUserGrowthService = async () => {
    const since = new Date();
    since.setDate(since.getDate() - GROWTH_LOOKBACK_DAYS);

    const growth = await userRepository.getUserGrowth(since);

    return growth.map((g) => ({
      label: new Date(g._id).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: g.count,
    }));
  };

  /**
   * Retrieves aggregate distribution metrics of mentors grouped by industry fields.
   * @returns {Promise<Array<Object>>} List of normalized industry objects with count keys.
   */
  const getMentorIndustryStatsService = async () => {
    const industries = await mentorProfileRepository.getMentorIndustryStats();
    return industries.map((i) => ({ industry: i._id, count: i.count }));
  };

  return {
    getStatsService,
    getUserGrowthService,
    getMentorIndustryStatsService,
  };
};

module.exports = createAdminStatsService;
