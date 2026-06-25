/**
 * @fileoverview Mentor Earnings and Financial Ledger Service
 * @description Business logic for computing revenue distributions, processing time-aggregated
 * earnings trends, formatting payout logs, and orchestrating balance withdrawal transfers via parameter injection.
 */

const AppError = require("../utils/AppError");

// Configuration Constants
const REVENUE_CHART_MONTHS = 6;
const REVENUE_CHART_WEEKS = 8;
const HISTORICAL_WEEK_DAYS_LOOKBACK = 55;
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_LIMIT_SIZE = 10;
const MAX_LIMIT_SIZE = 20;
const RADIX_DECIMAL = 10;

const createEarningsService = (
  connectRequestRepository,
  mentorRepository,
  walletRepository,
  transactionRepository,
  userRepository,
) => {
  /**
   * Compute aggregate, monthly, pending, and liquid financial balances for a distinct mentor.
   * @param {string} mentorId    - Unique identifier database key of the target mentor.
   * @returns {Promise<Object>}  Calculated revenue summary matrices.
   */
  const getEarningsSummaryService = async (mentorId) => {
    const [completed, ongoingSessions, mentorProfile, wallet] =
      await Promise.all([
        connectRequestRepository.findCompletedSessionsByMentor(mentorId),
        connectRequestRepository.findOngoingPaidSessionsByMentor(mentorId),
        mentorRepository.findMentorRating(mentorId),
        walletRepository.findWalletByUser(mentorId),
      ]);

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

  /**
   * Fetch a query-filtered, paginated ledger log of completed mentor payout activities.
   * @param {string} mentorId      - Unique identifier database key of the target mentor.
   * @param {Object} query         - Extraction criteria constraints.
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

  /**
   * Drain a mentor's available clear wallet liquid balance and submit a transaction ledger audit entry.
   * @param {string} mentorId   - Unique identifier database key of the initiating mentor.
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

  return {
    getEarningsSummaryService,
    getEarningsChartService,
    getPayoutHistoryService,
    withdrawEarningsService,
  };
};

module.exports = createEarningsService;
