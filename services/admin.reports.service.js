// services/admin.reports.service.js
const Report = require("../models/Report");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const ConnectRequest = require("../models/ConnectRequest");
const createNotification = require("../utils/createNotification");
const { sendReportResolvedEmail } = require("../utils/sendNotificationEmail");

// ── STATS ─────────────────────────────────────────────────────
const getReportStatsService = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalReports, pendingResolution, resolvedToday] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: { $in: ["open", "under_review"] } }),
    Report.countDocuments({ status: "resolved", resolvedAt: { $gte: today } }),
  ]);

  return { totalReports, pendingResolution, resolvedToday };
};

// ── GET REPORTS ───────────────────────────────────────────────
const getReportsService = async ({ page, limit, search, status }) => {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(20, parseInt(limit) || 10);
  const skip = (safePage - 1) * safeLimit;

  const filter = {};
  if (status) filter.status = status;

  if (search) {
    const matchingUsers = await User.find({
      name: { $regex: search, $options: "i" },
    })
      .select("_id")
      .lean();
    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [
      { reportedBy: { $in: userIds } },
      { reportedUser: { $in: userIds } },
    ];
  }

  const [totalCount, reports] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter)
      .populate("reportedBy", "name email")
      .populate("reportedUser", "name email")
      .populate(
        "connectRequest",
        "status paymentStatus totalAmount sessionRate sessionCount mentee mentor",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
  ]);

  const rows = reports.map((r) => ({
    id: r._id,
    mentee:
      r.reporterRole === "mentee" ? r.reportedBy?.name : r.reportedUser?.name,
    menteeEmail:
      r.reporterRole === "mentee" ? r.reportedBy?.email : r.reportedUser?.email,
    mentor:
      r.reporterRole === "mentor" ? r.reportedBy?.name : r.reportedUser?.name,
    mentorEmail:
      r.reporterRole === "mentor" ? r.reportedBy?.email : r.reportedUser?.email,
    reportedBy: r.reportedBy?.name || "—",
    reportedById: r.reportedBy?._id || null,
    reportedUser: r.reportedUser?.name || "—",
    reporterRole: r.reporterRole,
    category: r.complaintType,
    description: r.description,
    screenshotUrl: r.screenshotUrl || "",
    adminNote: r.adminNote || "",
    status: r.status,
    refundProcessed: r.refundProcessed || false,
    connectRequestId: r.connectRequest?._id || null,
    sessionStatus: r.connectRequest?.status || null,
    paymentStatus: r.connectRequest?.paymentStatus || null,
    totalAmount: r.connectRequest?.totalAmount || 0,
    date: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "—",
  }));

  return {
    reports: rows,
    pagination: {
      totalCount,
      currentPage: safePage,
      totalPages: Math.ceil(totalCount / safeLimit),
      hasMore: safePage < Math.ceil(totalCount / safeLimit),
    },
  };
};

// ── HANDLE REPORT ─────────────────────────────────────────────
const handleReportService = async (
  reportId,
  { status, adminNote },
  adminId,
) => {
  if (!["resolved", "dismissed"].includes(status))
    throw new Error("INVALID_STATUS");

  const report = await Report.findById(reportId)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email");
  if (!report) throw new Error("REPORT_NOT_FOUND");

  report.status = status;
  report.adminNote = adminNote?.trim() || report.adminNote;
  report.resolvedAt = new Date();
  report.resolvedBy = adminId;
  await report.save();

  // in-app notification
  const recipientId = report.reportedBy?._id;
  if (recipientId) {
    const otherPerson = report.reportedUser?.name || "the other user";
    await createNotification({
      recipient: recipientId,
      type: "new_review",
      title:
        status === "resolved"
          ? "Your report has been resolved ✅"
          : "Your report has been reviewed",
      message:
        status === "resolved"
          ? `Your complaint against ${otherPerson} has been resolved by our admin team.${adminNote ? ` Note: ${adminNote}` : ""}`
          : `Your complaint against ${otherPerson} was reviewed and dismissed.${adminNote ? ` Note: ${adminNote}` : ""}`,
      metadata: { requestId: report.connectRequest },
    });
  }

  // email notification (non-blocking)
  if (report.reportedBy?.email) {
    sendReportResolvedEmail({
      reporterName: report.reportedBy.name,
      reporterEmail: report.reportedBy.email,
      complaintType: report.complaintType,
      status,
      adminNote: adminNote?.trim() || "",
      reporterRole: report.reporterRole,
    }).catch((err) =>
      console.error("❌ sendReportResolvedEmail failed:", err.message),
    );
  }

  return {
    id: report._id,
    status: report.status,
    adminNote: report.adminNote,
    resolvedAt: report.resolvedAt,
  };
};

// ── PROCESS REFUND ────────────────────────────────────────────
const processRefundService = async (reportId, adminNote, adminId) => {
  const report = await Report.findById(reportId)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email")
    .populate("connectRequest");
  if (!report) throw new Error("REPORT_NOT_FOUND");

  if (report.reporterRole !== "mentee") throw new Error("NOT_MENTEE_REPORT");
  if (report.complaintType !== "refund") throw new Error("NOT_REFUND_REPORT");
  if (report.refundProcessed) throw new Error("ALREADY_REFUNDED");

  const connectRequest = report.connectRequest;
  if (!connectRequest) throw new Error("SESSION_NOT_FOUND");
  if (connectRequest.paymentStatus !== "paid") throw new Error("NOT_PAID");

  const menteeId = connectRequest.mentee;
  const totalAmount = connectRequest.totalAmount || 0;

  const menteeWallet = await Wallet.findOne({ user: menteeId });
  if (!menteeWallet) throw new Error("WALLET_NOT_FOUND");

  const refundAmount = Math.min(totalAmount, menteeWallet.escrow);
  menteeWallet.escrow = Math.max(0, menteeWallet.escrow - refundAmount);
  menteeWallet.balance += refundAmount;
  await menteeWallet.save();

  await Transaction.create({
    user: menteeId,
    type: "escrow_refund",
    amount: refundAmount,
    description: "Admin refund — report resolved",
    balanceAfter: menteeWallet.balance,
    connectRequest: connectRequest._id,
  });

  connectRequest.paymentStatus = "refunded";
  connectRequest.status = "rejected";
  await connectRequest.save();

  const resolvedAdminNote = adminNote?.trim() || "Refund processed by admin.";
  report.refundProcessed = true;
  report.refundedAt = new Date();
  report.status = "resolved";
  report.resolvedAt = new Date();
  report.resolvedBy = adminId;
  report.adminNote = resolvedAdminNote;
  await report.save();

  await createNotification({
    recipient: menteeId,
    type: "new_review",
    title: "Refund processed ✅",
    message: `Your refund of ${refundAmount} tokens has been returned to your wallet by the admin team.`,
    metadata: { requestId: connectRequest._id, amount: refundAmount },
  });

  // email notification (non-blocking)
  if (report.reportedBy?.email) {
    sendReportResolvedEmail({
      reporterName: report.reportedBy.name,
      reporterEmail: report.reportedBy.email,
      complaintType: report.complaintType,
      status: "resolved",
      adminNote: resolvedAdminNote,
      reporterRole: report.reporterRole,
    }).catch((err) =>
      console.error("❌ sendReportResolvedEmail (refund) failed:", err.message),
    );
  }

  return { refundAmount };
};

// ── DELETE SESSION ────────────────────────────────────────────
const deleteSessionService = async (reportId, adminNote, adminId) => {
  const report = await Report.findById(reportId)
    .populate("reportedBy", "name email")
    .populate("reportedUser", "name email")
    .populate({
      path: "connectRequest",
      populate: [
        { path: "mentee", select: "name email" },
        { path: "mentor", select: "name email" },
      ],
    });
  if (!report) throw new Error("REPORT_NOT_FOUND");

  const connectRequest = report.connectRequest;
  if (!connectRequest) throw new Error("SESSION_NOT_FOUND");

  const menteeId = connectRequest.mentee?._id || connectRequest.mentee;
  const mentorId = connectRequest.mentor?._id || connectRequest.mentor;
  const menteeName = connectRequest.mentee?.name || "Mentee";
  const mentorName = connectRequest.mentor?.name || "Mentor";

  await ConnectRequest.findByIdAndDelete(connectRequest._id);

  // notify both parties
  if (menteeId) {
    await createNotification({
      recipient: menteeId,
      type: "new_review",
      title: "Session removed by admin",
      message: `Your session with ${mentorName} has been removed by the admin team following a report.`,
      metadata: { requestId: connectRequest._id },
    });
  }
  if (mentorId) {
    await createNotification({
      recipient: mentorId,
      type: "new_review",
      title: "Session removed by admin",
      message: `Your session with ${menteeName} has been removed by the admin team following a report.`,
      metadata: { requestId: connectRequest._id },
    });
  }

  const resolvedAdminNote = adminNote?.trim() || "Session deleted by admin.";
  report.adminNote = resolvedAdminNote;
  report.status = "resolved";
  report.resolvedAt = new Date();
  report.resolvedBy = adminId;
  await report.save();

  // email notification (non-blocking)
  if (report.reportedBy?.email) {
    sendReportResolvedEmail({
      reporterName: report.reportedBy.name,
      reporterEmail: report.reportedBy.email,
      complaintType: report.complaintType,
      status: "resolved",
      adminNote: resolvedAdminNote,
      reporterRole: report.reporterRole,
    }).catch((err) =>
      console.error(
        "❌ sendReportResolvedEmail (deleteSession) failed:",
        err.message,
      ),
    );
  }
};

module.exports = {
  getReportStatsService,
  getReportsService,
  handleReportService,
  processRefundService,
  deleteSessionService,
};
