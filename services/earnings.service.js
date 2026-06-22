/**
 * @fileoverview Mentor Earnings and Financial Ledger Service
 * @description  Business logic for computing revenue distributions, processing time-aggregated
 * earnings trends, formatting payout logs, and orchestrating balance withdrawal transfers.
 */

const AppError = require("../utils/AppError");
const connectRequestRepository = require("../repositories/connectRequest.repository");
const mentorRepository = require("../repositories/mentor.repository");
const walletRepository = require("../repositories/wallet.repository");
const transactionRepository = require("../repositories/transaction.repository");
const userRepository = require("../repositories/user.repository");

// Configuration Constants
const REVENUE_CHART_MONTHS = 6;
const REVENUE_CHART_WEEKS = 8;
const HISTORICAL_WEEK_DAYS_LOOKBACK = 55;
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_LIMIT_SIZE = 10;
const MAX_LIMIT_SIZE = 20;
const RADIX_DECIMAL = 10;

// ── EARNINGS TELEMETRY SUMMARY ────────────────────────────────

/**
 * Compute aggregate, monthly, pending, and liquid financial balances for a distinct mentor.
 * @param {string} mentorId    - Unique identifier database key of the target mentor.
 * @returns {Promise<Object>}  Calculated revenue summary matrices.
 */
const getEarningsSummaryService = async (mentorId) => {
  const [completed, ongoingSessions, mentorProfile, wallet] = await Promise.all(
    [
      connectRequestRepository.findCompletedSessionsByMentor(mentorId),
      connectRequestRepository.findOngoingPaidSessionsByMentor(mentorId),
      mentorRepository.findMentorRating(mentorId),
      walletRepository.findWalletByUser(mentorId),
    ],
  );

  const totalEarnings = completed.reduce(
    (accumulator, session) => accumulator + (session.totalAmount || 0),
    0,
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsThisMonth = completed.filter(
    (session) =>
      session.completedAt && new Date(session.completedAt) >= monthStart,
  ).length;

  const avgRating = mentorProfile?.avgRating || 0;
  const pendingPayout = ongoingSessions.reduce(
    (accumulator, session) => accumulator + (session.mentorPayout || 0),
    0,
  );

  return {
    totalEarnings,
    sessionsThisMonth,
    avgRating,
    pendingPayout,
    walletBalance: wallet?.balance || 0,
  };
};

// ── CHRONOLOGICAL REVENUE TRENDS ───────────────────────────────

/**
 * Generate a historical dataset of localized earnings categorized by month or week clusters.
 * @param {string} mentorId    - Unique identifier database key of the target mentor.
 * @param {string} period      - Chronological parsing strategy constraint ("monthly" or "weekly").
 * @returns {Promise<Object>}  Object containing the target distribution interval layout and structural bars data array.
 */
const getEarningsChartService = async (mentorId, period) => {
  const now = new Date();
  const data = [];

  if (period === "monthly") {
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - (REVENUE_CHART_MONTHS - 1),
      1,
    );
    const completed =
      await connectRequestRepository.findCompletedSessionsByMentorSince(
        mentorId,
        startDate,
      );

    for (let i = REVENUE_CHART_MONTHS - 1; i >= 0; i--) {
      const targetMonthDate = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1,
      );
      const label = targetMonthDate
        .toLocaleString("en-US", { month: "short" })
        .toUpperCase();

      const amount = completed
        .filter((session) => {
          const completedDate = new Date(session.completedAt);
          return (
            completedDate.getFullYear() === targetMonthDate.getFullYear() &&
            completedDate.getMonth() === targetMonthDate.getMonth()
          );
        })
        .reduce(
          (accumulator, session) => accumulator + (session.totalAmount || 0),
          0,
        );

      data.push({ label, amount });
    }
  } else {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - HISTORICAL_WEEK_DAYS_LOOKBACK);
    const completed =
      await connectRequestRepository.findCompletedSessionsByMentorSince(
        mentorId,
        startDate,
      );

    for (let i = REVENUE_CHART_WEEKS - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const label = `W${REVENUE_CHART_WEEKS - i}`;
      const amount = completed
        .filter((session) => {
          const completedDate = new Date(session.completedAt);
          return completedDate >= weekStart && completedDate < weekEnd;
        })
        .reduce(
          (accumulator, session) => accumulator + (session.totalAmount || 0),
          0,
        );

      data.push({ label, amount });
    }
  }

  return { period, data };
};

// ── AUDIT PAYOUT HISTORY ──────────────────────────────────────

/**
 * Fetch a query-filtered, paginated ledger log of completed mentor payout activities.
 * @param {string} mentorId      - Unique identifier database key of the target mentor.
 * @param {Object} query         - Extraction criteria constraints.
 * @param {string} [query.page]  - Current active target page reference pointer.
 * @param {string} [query.limit] - Absolute maximum item volume constraint per page.
 * @param {string} [query.search]- Search context parameter string targeting peer mentee names.
 * @returns {Promise<Object>}    Normalized data collection rows paired alongside strict pagination metadata maps.
 */
const getPayoutHistoryService = async (mentorId, query) => {
  const page = Math.max(
    1,
    Number.parseInt(query.page, RADIX_DECIMAL) || DEFAULT_PAGE_NUMBER,
  );
  const limit = Math.min(
    MAX_LIMIT_SIZE,
    Number.parseInt(query.limit, RADIX_DECIMAL) || DEFAULT_LIMIT_SIZE,
  );
  const search = query.search?.trim() || "";
  const skip = (page - 1) * limit;

  const dbQuery = { mentor: mentorId, status: "completed" };

  if (search) {
    const matchingUsers = await userRepository.findUsersByNameSearch(search);
    const userIds = matchingUsers.map((user) => user._id);
    dbQuery.mentee = { $in: userIds };
  }

  const [totalCount, payouts] = await Promise.all([
    connectRequestRepository.countPayoutHistory(dbQuery),
    connectRequestRepository.findPayoutHistory(dbQuery, { skip, limit }),
  ]);

  const rows = payouts.map((payout) => ({
    id: payout._id,
    date: payout.completedAt
      ? new Date(payout.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    menteeName: payout.mentee?.name || "—",
    menteeEmail: payout.mentee?.email || "—",
    sessionType: payout.confirmedSlot?.day || "—",
    duration: payout.confirmedSlot
      ? (() => {
          const [startHour, startMinute] = (
            payout.confirmedSlot.startTime || "0:0"
          )
            .split(":")
            .map(Number);
          const [endHour, endMinute] = (payout.confirmedSlot.endTime || "0:0")
            .split(":")
            .map(Number);
          const minutesDifference =
            endHour * 60 + endMinute - (startHour * 60 + startMinute);
          return `${minutesDifference} mins`;
        })()
      : "—",
    amount: payout.totalAmount || 0,
    status: payout.paymentStatus || "paid",
  }));

  return {
    payouts: rows,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page < Math.ceil(totalCount / limit),
    },
  };
};

// ── OUTBOUND FINANCIAL WITHDRAWALS ────────────────────────────

/**
 * Drain a mentor's available clear wallet liquid balance and submit a transaction ledger audit entry.
 * @param {string} mentorId   - Unique identifier database key of the initiating mentor.
 * @throws {AppError} 404      - If the target asset account profile details cannot be located.
 * @throws {AppError} 400      - If the available liquid processing balance maps to less than or equal to zero.
 * @returns {Promise<Object>}  Verification snapshot detailing withdrawn value and updated tracking balance metrics.
 */
const withdrawEarningsService = async (mentorId) => {
  const wallet = await walletRepository.findWalletByUserMutable(mentorId);

  if (!wallet) {
    throw new AppError("Wallet registration records not found.", 404);
  }
  if (wallet.balance <= 0) {
    throw new AppError(
      "No clear liquid balances are currently available to withdraw.",
      400,
    );
  }

  const withdrawn = wallet.balance;
  wallet.balance = 0;

  await walletRepository.saveWallet(wallet);

  await transactionRepository.createTransaction({
    user: mentorId,
    type: "withdrawal",
    amount: withdrawn,
    description: "Mentor outward payout financial withdrawal request.",
    balanceAfter: 0,
  });

  return { withdrawn, newBalance: 0 };
};

module.exports = {
  getEarningsSummaryService,
  getEarningsChartService,
  getPayoutHistoryService,
  withdrawEarningsService,
};
