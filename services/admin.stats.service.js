// services/admin.stats.service.js
const User = require("../models/User");
const MentorProfile = require("../models/MentorProfile");

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
    User.countDocuments({}).setOptions({ ignoreIsDeleted: true }),
    User.countDocuments({ roles: "mentor" }).setOptions({
      ignoreIsDeleted: true,
    }),
    User.countDocuments({ roles: "mentee" }).setOptions({
      ignoreIsDeleted: true,
    }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }).setOptions({
      ignoreIsDeleted: true,
    }),
    User.countDocuments({
      roles: "mentor",
      createdAt: { $gte: startOfMonth },
    }).setOptions({ ignoreIsDeleted: true }),
    User.countDocuments({
      roles: "mentee",
      createdAt: { $gte: startOfMonth },
    }).setOptions({ ignoreIsDeleted: true }),
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

  const growth = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return growth.map((g) => ({
    label: new Date(g._id).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: g.count,
  }));
};

const getMentorIndustryStatsService = async () => {
  const industries = await MentorProfile.aggregate([
    { $match: { industry: { $exists: true, $ne: null, $ne: "" } } },
    { $group: { _id: "$industry", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ]);

  return industries.map((i) => ({ industry: i._id, count: i.count }));
};

module.exports = {
  getStatsService,
  getUserGrowthService,
  getMentorIndustryStatsService,
};
