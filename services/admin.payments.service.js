const { findAdminById } = require("../repositories/admin.repository");
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

const getPaymentStatsService = async (adminId) => {
  const adminUser = await findAdminById(adminId);
  const commissionRate = adminUser?.commissionRate ?? 20;

  const completedSessions = await findCompletedPaidSessions();
  const totalRevenue = completedSessions.reduce(
    (s, r) => s + (r.totalAmount || 0),
    0,
  );
  const platformCommission = completedSessions.reduce(
    (s, r) => s + (r.commissionAmount || 0),
    0,
  );

  const wallets = await findAllWallets();
  const pendingPayouts = wallets.reduce((s, w) => s + (w.escrow || 0), 0);

  const refundedRequests = await countRefundedRequests();

  return {
    totalRevenue,
    platformCommission,
    commissionRate,
    pendingPayouts,
    refundedRequests,
  };
};

const getRevenueChartService = async () => {
  const now = new Date();
  const data = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = monthStart
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();

    const sessions = await findSessionsByMonth(monthStart, monthEnd);
    const amount = sessions.reduce((s, r) => s + (r.totalAmount || 0), 0);
    data.push({ label, amount });
  }

  return data;
};

const getTransactionsService = async ({ page, limit, search, type }) => {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(20, parseInt(limit) || 10);
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

  const rows = transactions.map((t) => ({
    id: t._id,
    txId: `#TRX-${String(t._id).slice(-5).toUpperCase()}`,
    user: { name: t.user?.name || "—", email: t.user?.email || "—" },
    amount: t.amount || 0,
    type: t.type || "—",
    description: t.description || "—",
    date: t.createdAt
      ? new Date(t.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    status:
      t.type === "escrow_refund"
        ? "refunded"
        : t.type === "escrow_hold"
          ? "pending"
          : t.type === "withdrawal"
            ? "pending"
            : "completed",
  }));

  return {
    transactions: rows,
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
