const {
  countUsersWithOptions,
  getUserGrowth,
} = require("../repositories/user.repository");
const { getMentorIndustryStats } = require("../repositories/mentor.repository");

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
    countUsersWithOptions({}),
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

const getUserGrowthService = async () => {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const growth = await getUserGrowth(since);

  return growth.map((g) => ({
    label: new Date(g._id).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: g.count,
  }));
};

const getMentorIndustryStatsService = async () => {
  const industries = await getMentorIndustryStats();
  return industries.map((i) => ({ industry: i._id, count: i.count }));
};

module.exports = {
  getStatsService,
  getUserGrowthService,
  getMentorIndustryStatsService,
};
