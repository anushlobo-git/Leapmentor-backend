/**
 * @fileoverview Admin Payments Service
 * @description Business logic for computing financial telemetry, compiling chronological
 * revenue trends, and querying the global transactional financial ledger. Receives injected repositories.
 */

const { toTransactionDTO } = require("../mappers/transaction.mapper");

// Financial and Layout Constants
const DEFAULT_COMMISSION_RATE = 20;
const REVENUE_CHART_MONTHS_LOOKBACK = 6;
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_LIMIT_SIZE = 10;
const MAX_LIMIT_SIZE = 20;

const createAdminPaymentsService = (
  adminUserRepository,
  connectRequestRepository,
  walletRepository,
  transactionRepository,
  userRepository,
) => {
  /**
   * Computes platform-wide escrow balances, aggregate transaction revenue, and commission volumes.
   * @param {string} adminId     - Unique identifier database key of the requesting admin.
   * @returns {Promise<Object>}  Calculated payment telemetry and commission metrics.
   */
  const getPaymentStatsService = async (adminId) => {
    const adminUser = await adminUserRepository.findAdminByIdLean(adminId);
    const commissionRate = adminUser?.commissionRate ?? DEFAULT_COMMISSION_RATE;

    const completedSessions =
      await connectRequestRepository.findCompletedPaidSessions();

    const totalRevenue = completedSessions.reduce(
      (accumulator, session) => accumulator + (session.totalAmount || 0),
      0,
    );

    const platformCommission = completedSessions.reduce(
      (accumulator, session) => accumulator + (session.commissionAmount || 0),
      0,
    );

    const wallets = await walletRepository.findAllWallets();
    const pendingPayouts = wallets.reduce(
      (accumulator, wallet) => accumulator + (wallet.escrow || 0),
      0,
    );

    const refundedRequests =
      await connectRequestRepository.countRefundedRequests();

    return {
      totalRevenue,
      platformCommission,
      commissionRate,
      pendingPayouts,
      refundedRequests,
    };
  };

  /**
   * Compiles chronological revenue aggregates across a rolling multi-month lookback period.
   * ⚡ OPTIMIZED: Parallelized database execution loops via Promise.all to eliminate sequential blocking.
   * @returns {Promise<Array<Object>>} List of objects containing month names and respective total amounts.
   */
  const getRevenueChartService = async () => {
    const now = new Date();
    const lookbackRanges = [];

    for (let i = REVENUE_CHART_MONTHS_LOOKBACK - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = monthStart
        .toLocaleString("en-US", { month: "short" })
        .toUpperCase();

      lookbackRanges.push({ monthStart, monthEnd, label });
    }

    return Promise.all(
      lookbackRanges.map(async ({ monthStart, monthEnd, label }) => {
        const sessions = await connectRequestRepository.findSessionsByMonth(
          monthStart,
          monthEnd,
        );
        const amount = sessions.reduce(
          (accumulator, session) => accumulator + (session.totalAmount || 0),
          0,
        );
        return { label, amount };
      }), 
    );
  };

  /**
   * Query a paginated, filtered subset of the global platform transaction log.
   */
  const getTransactionsService = async ({ page, limit, search, type }) => {
    const safePage = Math.max(
      1,
      Number.parseInt(page, 10) || DEFAULT_PAGE_NUMBER,
    );
    const safeLimit = Math.min(
      MAX_LIMIT_SIZE,
      Number.parseInt(limit, 10) || DEFAULT_LIMIT_SIZE,
    );
    const skip = (safePage - 1) * safeLimit;

    const filter = {};

    if (search?.trim()) {
      const matchingUsers = await userRepository.findUsersByName(search);
      filter.user = { $in: matchingUsers.map((u) => u._id) };
    }

    if (type?.trim()) {
      filter.type = type.trim();
    } else {
      filter.type = { $ne: "credit" };
    }

    const [totalCount, transactions] = await Promise.all([
      transactionRepository.countTransactions(filter),
      transactionRepository.findTransactions(filter, {
        skip,
        limit: safeLimit,
      }),
    ]);

    return {
      transactions: transactions.map(toTransactionDTO),
      pagination: {
        totalCount,
        currentPage: safePage,
        totalPages: Math.ceil(totalCount / safeLimit),
        hasMore: safePage < Math.ceil(totalCount / safeLimit),
      },
    };
  };

  return {
    getPaymentStatsService,
    getRevenueChartService,
    getTransactionsService,
  };
};

module.exports = createAdminPaymentsService;
