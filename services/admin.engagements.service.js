// services/admin.engagements.service.js
const ConnectRequest = require("../models/ConnectRequest");
const User = require("../models/User");

const getEngagementStatsService = async () => {
  const statuses = [
    "pending",
    "accepted",
    "rejected",
    "referred",
    "ongoing",
    "completed",
  ];

  const counts = await Promise.all(
    statuses.map((s) => ConnectRequest.countDocuments({ status: s })),
  );

  const stats = Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  stats.total = counts.reduce((a, b) => a + b, 0);
  return stats;
};

const getEngagementsService = async ({
  status,
  search,
  dateFrom,
  dateTo,
  page = 1,
  limit = 15,
}) => {
  const filter = {};

  if (status) filter.status = status;

  if (dateFrom || dateTo) {
    filter.requestedAt = {};
    if (dateFrom) filter.requestedAt.$gte = new Date(dateFrom);
    if (dateTo)
      filter.requestedAt.$lte = new Date(
        new Date(dateTo).setHours(23, 59, 59, 999),
      );
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    const matchingUsers = await User.find({
      $or: [{ name: regex }, { email: regex }],
    })
      .select("_id")
      .lean();

    const ids = matchingUsers.map((u) => u._id);
    filter.$or = [{ mentor: { $in: ids } }, { mentee: { $in: ids } }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await ConnectRequest.countDocuments(filter);

  const engagements = await ConnectRequest.find(filter)
    .populate("mentor", "name email")
    .populate("mentee", "name email")
    .sort({ requestedAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  return {
    engagements,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

module.exports = { getEngagementStatsService, getEngagementsService };
