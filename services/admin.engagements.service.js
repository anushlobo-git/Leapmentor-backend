const {
  countByStatus,
  countByFilter,
  findEngagements,
} = require("../repositories/connectRequest.repository");
const { findUsersBySearchTerm } = require("../repositories/user.repository");

const STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "referred",
  "ongoing",
  "completed",
];

const getEngagementStatsService = async () => {
  const counts = await Promise.all(STATUSES.map(countByStatus));
  const stats = Object.fromEntries(STATUSES.map((s, i) => [s, counts[i]]));
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
    const matchingUsers = await findUsersBySearchTerm(search);
    const ids = matchingUsers.map((u) => u._id);
    filter.$or = [{ mentor: { $in: ids } }, { mentee: { $in: ids } }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await countByFilter(filter);
  const engagements = await findEngagements(filter, {
    skip,
    limit: Number(limit),
  });

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
