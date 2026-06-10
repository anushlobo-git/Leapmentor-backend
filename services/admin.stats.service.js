/**
 * @fileoverview Admin Statistics Service
 * @description  Business logic for gathering, processing, and formatting platform telemetry 
 * and growth metrics. Coordinates between user and mentor repositories.
 */

const {
  countUsersWithOptions,
  getUserGrowth,
} = require("../repositories/user.repository");
const { getMentorIndustryStats } = require("../repositories/mentor.repository");

// Configurations
const GROWTH_LOOKBACK_DAYS = 90;

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
    countUsersWithOptions({ }),
    countUsersWithOptions({ roles: "mentor" }),
    countUsersWithOptions({ roles: "mentee" }),
    countUsersWithOptions({ createdAt: { $gte: startOfMonth } }),
    countUsersWithOptions({
      roles: "mentor",
      createdAt: { $gte: startOfMonth },
    }),
    countUsersWithOptions({
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

  const growth = await getUserGrowth(since);

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
  const industries = await getMentorIndustryStats();
  return industries.map((i) => ({ industry: i._id, count: i.count }));
};

module.exports = {
  getStatsService,
  getUserGrowthService,
  getMentorIndustryStatsService,
};