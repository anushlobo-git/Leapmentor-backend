const connectRequestRepository = require("../repositories/connectRequest.repository");
const mentorRepository = require("../repositories/mentor.repository");
const walletRepository = require("../repositories/wallet.repository");
const transactionRepository = require("../repositories/transaction.repository");
const userRepository = require("../repositories/user.repository");

// ── EARNINGS SUMMARY ──────────────────────────────────────────
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
    (sum, r) => sum + (r.totalAmount || 0),
    0,
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsThisMonth = completed.filter(
    (r) => r.completedAt && new Date(r.completedAt) >= monthStart,
  ).length;

  const avgRating = mentorProfile?.avgRating || 0;
  const pendingPayout = ongoingSessions.reduce(
    (sum, r) => sum + (r.mentorPayout || 0),
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

// ── EARNINGS CHART ────────────────────────────────────────────
const getEarningsChartService = async (mentorId, period) => {
  const now = new Date();
  const data = [];

  if (period === "monthly") {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const completed =
      await connectRequestRepository.findCompletedSessionsByMentorSince(
        mentorId,
        startDate,
      );

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
      const amount = completed
        .filter((r) => {
          const c = new Date(r.completedAt);
          return (
            c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
          );
        })
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      data.push({ label, amount });
    }
  } else {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 55);
    const completed =
      await connectRequestRepository.findCompletedSessionsByMentorSince(
        mentorId,
        startDate,
      );

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const label = `W${8 - i}`;
      const amount = completed
        .filter((r) => {
          const c = new Date(r.completedAt);
          return c >= weekStart && c < weekEnd;
        })
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      data.push({ label, amount });
    }
  }

  return { period, data };
};

// ── PAYOUT HISTORY ────────────────────────────────────────────
const getPayoutHistoryService = async (mentorId, query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(20, parseInt(query.limit) || 10);
  const search = query.search?.trim() || "";
  const skip = (page - 1) * limit;

  const dbQuery = { mentor: mentorId, status: "completed" };

  if (search) {
    const matchingUsers = await userRepository.findUsersByNameSearch(search);
    const userIds = matchingUsers.map((u) => u._id);
    dbQuery.mentee = { $in: userIds };
  }

  const [totalCount, payouts] = await Promise.all([
    connectRequestRepository.countPayoutHistory(dbQuery),
    connectRequestRepository.findPayoutHistory(dbQuery, { skip, limit }),
  ]);

  const rows = payouts.map((r) => ({
    id: r._id,
    date: r.completedAt
      ? new Date(r.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    menteeName: r.mentee?.name || "—",
    menteeEmail: r.mentee?.email || "—",
    sessionType: r.confirmedSlot?.day || "—",
    duration: r.confirmedSlot
      ? (() => {
          const [sh, sm] = (r.confirmedSlot.startTime || "0:0")
            .split(":")
            .map(Number);
          const [eh, em] = (r.confirmedSlot.endTime || "0:0")
            .split(":")
            .map(Number);
          const mins = eh * 60 + em - (sh * 60 + sm);
          return `${mins} mins`;
        })()
      : "—",
    amount: r.totalAmount || 0,
    status: r.paymentStatus || "paid",
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

// ── WITHDRAW EARNINGS ─────────────────────────────────────────
const withdrawEarningsService = async (mentorId) => {
  const wallet = await walletRepository.findWalletByUserMutable(mentorId);

  if (!wallet)
    throw Object.assign(new Error("Wallet not found"), { statusCode: 404 });
  if (wallet.balance <= 0)
    throw Object.assign(new Error("No balance available to withdraw"), {
      statusCode: 400,
    });

  const withdrawn = wallet.balance;
  wallet.balance = 0;
  await walletRepository.saveWallet(wallet);

  await transactionRepository.createTransaction({
    user: mentorId,
    type: "withdrawal",
    amount: withdrawn,
    description: "Mentor withdrawal request",
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
