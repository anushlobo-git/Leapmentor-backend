/**
 * @fileoverview Admin Engagements Service
 * @description Coordinates transaction tracking counts, data filters,
 * and structured search history lookups. Receives injected repositories.
 */

const { toConnectRequestDTO } = require("../mappers/connectRequest.mapper");

// Fallback Values & Configurations
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 15;
const SYSTEM_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "referred",
  "ongoing",
  "completed",
];

const createAdminEngagementsService = (
  connectRequestRepository,
  userRepository,
) => {
  /**
   * Generates an object mapping system engagement states to total transaction volumes.
   * @returns {Promise<Object>} Structured dictionary displaying distinct phase summaries and totals.
   */
  const getEngagementStatsService = async () => {
    const counts = await Promise.all(
      SYSTEM_STATUSES.map((status) =>
        connectRequestRepository.countByStatus(status),
      ),
    );

    const stats = Object.fromEntries(
      SYSTEM_STATUSES.map((s, i) => [s, counts[i]]),
    );

    stats.total = counts.reduce((a, b) => a + b, 0);
    return stats;
  };

  /**
   * Compiles a chronologically bounded, paginated list of ecosystem connection histories.
   * @param {Object} params             - Structured execution boundaries.
   * @param {string} [params.status]    - Active tracking lifecycle filter status tag.
   * @param {string} [params.search]    - Identification string checking name or email indices.
   * @param {string} [params.dateFrom]  - Starting historical chronological target limit.
   * @param {string} [params.dateTo]    - Ending historical chronological target limit.
   * @param {number} [params.page]      - Pagination window boundary pointer index.
   * @param {number} [params.limit]     - Uniform volume distribution slice limitation.
   * @returns {Promise<Object>} Collection history data paired with standard navigation maps.
   */
  const getEngagementsService = async ({
    status,
    search,
    dateFrom,
    dateTo,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  }) => {
    const filter = {};

    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.requestedAt = {};
      if (dateFrom) filter.requestedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        filter.requestedAt.$lte = new Date(
          new Date(dateTo).setHours(23, 59, 59, 999),
        );
      }
    }

    if (search && search.trim()) {
      const matchingUsers = await userRepository.findUsersBySearchTerm(search);
      const ids = matchingUsers.map((u) => u._id);
      filter.$or = [{ mentor: { $in: ids } }, { mentee: { $in: ids } }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await connectRequestRepository.countByFilter(filter);
    const engagements = await connectRequestRepository.findEngagements(filter, {
      skip,
      limit: Number(limit),
    });

    return {
      engagements: engagements.map(toConnectRequestDTO),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  };

  return {
    getEngagementStatsService,
    getEngagementsService,
  };
};

module.exports = createAdminEngagementsService;
