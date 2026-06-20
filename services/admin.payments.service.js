/**
 * @fileoverview Admin Payments Service
 * @description  Business logic for computing financial telemetry, compiling chronological
 * revenue trends, and querying the global transactional financial ledger.
 */

const { findAdminByIdLean } = require("../repositories/admin.repository");
const {
  findCompletedPaidSessions,
  countRefundedRequests,
  findSessionsByMonth,
} = require("../repositories/connectRequest.repository");
const { findAllWallets } = require("../repositories/wallet.repository");
const {
  countTransactions,
  findTransactions,
} = require("../repositories/transaction.repository");
const { findUsersByName } = require("../repositories/user.repository");

// Mappers
const { toTransactionDTO } = require("../mappers/transaction.mapper");

// Financial and Layout Constants
const DEFAULT_COMMISSION_RATE = 20;
const REVENUE_CHART_MONTHS_LOOKBACK = 6;
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_LIMIT_SIZE = 10;
const MAX_LIMIT_SIZE = 20;

// ── FINANCIAL METRICS TELEMETRY ───────────────────────────────

/**
 * Computes platform-wide escrow balances, aggregate transaction revenue, and commission volumes.
 * @param {string} adminId     - Unique identifier database key of the requesting admin.
 * @returns {Promise<Object>}  Calculated payment telemetry and commission metrics.
 */
const getPaymentStatsService = async (adminId) => {
  const adminUser = await findAdminByIdLean(adminId);
  const commissionRate = adminUser?.commissionRate ?? DEFAULT_COMMISSION_RATE;

  const completedSessions = await findCompletedPaidSessions();

  const totalRevenue = completedSessions.reduce(
    (accumulator, session) => accumulator + (session.totalAmount || 0),
    0,
  );

  const platformCommission = completedSessions.reduce(
    (accumulator, session) => accumulator + (session.commissionAmount || 0),
    0,
  );

  const wallets = await findAllWallets();
  const pendingPayouts = wallets.reduce(
    (accumulator, wallet) => accumulator + (wallet.escrow || 0),
    0,
  );

  const refundedRequests = await countRefundedRequests();

  return {
    totalRevenue,
    platformCommission,
    commissionRate,
    pendingPayouts,
    refundedRequests,
  };
};

// ── HISTORICAL REVENUE TRENDS ─────────────────────────────────

/**
 * Compiles chronological revenue aggregates across a rolling multi-month lookback period.
 * @returns {Promise<Array<Object>>} List of objects containing month names and respective total amounts.
 */
const getRevenueChartService = async () => {
  const now = new Date();
  const data = [];

  for (let i = REVENUE_CHART_MONTHS_LOOKBACK - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const label = monthStart
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();

    const sessions = await findSessionsByMonth(monthStart, monthEnd);
    const amount = sessions.reduce(
      (accumulator, session) => accumulator + (session.totalAmount || 0),
      0,
    );

    data.push({ label, amount });
  }

  return data;
};

// ── AUDIT LEDGER TRANSACTION FLOWS ────────────────────────────

/**
 * Query a paginated, filtered subset of the global platform transaction log.
 * @param {Object} query         - Extraction criteria constraints.
 * @param {string} [query.page]  - Current active target page reference pointer.
 * @param {string} [query.limit] - Absolute maximum item volume constraint per page.
 * @param {string} [query.search]- Search context filtering target user accounts by name.
 * @param {string} [query.type]  - Explicit transactional filtering action parameter tag.
 * @returns {Promise<Object>}    Normalized rows containing detailed status definitions and pagination data.
 */
const getTransactionsService = async ({ page, limit, search, type }) => {
  const safePage = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE_NUMBER);
  const safeLimit = Math.min(
    MAX_LIMIT_SIZE,
    parseInt(limit, 10) || DEFAULT_LIMIT_SIZE,
  );
  const skip = (safePage - 1) * safeLimit;

  const filter = {};

  if (search?.trim()) {
    const matchingUsers = await findUsersByName(search);
    filter.user = { $in: matchingUsers.map((u) => u._id) };
  }

  if (type?.trim()) {
    filter.type = type.trim();
  } else {
    filter.type = { $ne: "credit" };
  }

  const [totalCount, transactions] = await Promise.all([
    countTransactions(filter),
    findTransactions(filter, { skip, limit: safeLimit }),
  ]);

  return {
    //  Entire structural mapping block replaced with a clean, decoupled collection map:
    transactions: transactions.map(toTransactionDTO),
    pagination: {
      totalCount,
      currentPage: safePage,
      totalPages: Math.ceil(totalCount / safeLimit),
      hasMore: safePage < Math.ceil(totalCount / safeLimit),
    },
  };
};

module.exports = {
  getPaymentStatsService,
  getRevenueChartService,
  getTransactionsService,
};
