const AppError = require("../utils/AppError");
const fireAndForgetEmail = require("../utils/fireAndForgetEmail");
const {
  countAllReports,
  countReportsByFilter,
  findReports,
  findReportByIdWithUsers,
  findReportByIdWithAll,
  findReportByIdWithConnectFull,
  saveReport,
} = require("../repositories/report.repository");
const { findUsersByName } = require("../repositories/user.repository");
const {
  findWalletByUserId,
  saveWallet,
} = require("../repositories/wallet.repository");
const { createTransaction } = require("../repositories/transaction.repository");
const {
  deleteRequestById,
} = require("../repositories/connectRequest.repository");
const createNotification = require("../utils/createNotification");
const { sendReportResolvedEmail } = require("../utils/sendNotificationEmail");
const { toReportDTO } = require("../mappers/report.mapper");


const getReportStatsService = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalReports, pendingResolution, resolvedToday] = await Promise.all([
    countAllReports(),
    countReportsByFilter({ status: { $in: ["open", "under_review"] } }),
    countReportsByFilter({ status: "resolved", resolvedAt: { $gte: today } }),
  ]);

  return { totalReports, pendingResolution, resolvedToday };
};

const getReportsService = async ({ page, limit, search, status }) => {
  const safePage = Math.max(1, parseInt(page) || 1);
  const safeLimit = Math.min(20, parseInt(limit) || 10);
  const skip = (safePage - 1) * safeLimit;

  const filter = {};
  if (status) filter.status = status;

  if (search) {
    const matchingUsers = await findUsersByName(search);
    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [
      { reportedBy: { $in: userIds } },
      { reportedUser: { $in: userIds } },
    ];
  }

  const [totalCount, reports] = await Promise.all([
    countReportsByFilter(filter),
    findReports(filter, { skip, limit: safeLimit }),
  ]);

  return {
    //  Entire 30-line handwritten translation array logic cleanly replaced here:
    reports: reports.map(toReportDTO),
    pagination: {
      totalCount,
      currentPage: safePage,
      totalPages: Math.ceil(totalCount / safeLimit),
      hasMore: safePage < Math.ceil(totalCount / safeLimit),
    },
  };
};

const handleReportService = async (
  reportId,
  { status, adminNote },
  adminId,
) => {
  if (!["resolved", "dismissed"].includes(status))
    throw new AppError("Status must be resolved or dismissed.", 400);

  const report = await findReportByIdWithUsers(reportId);
  if (!report) throw new AppError("Report not found.", 404);

  report.status = status;
  report.adminNote = adminNote?.trim() || report.adminNote;
  report.resolvedAt = new Date();
  report.resolvedBy = adminId;
  await saveReport(report);

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

  if (report.reportedBy?.email) {
    fireAndForgetEmail(
      () =>
        sendReportResolvedEmail({
          reporterName: report.reportedBy.name,
          reporterEmail: report.reportedBy.email,
          complaintType: report.complaintType,
          status,
          adminNote: adminNote?.trim() || "",
          reporterRole: report.reporterRole,
        }),
      "Admin Report Handled Resolution",
    );
  }

  return toReportDTO(report);
};

const processRefundService = async (reportId, adminNote, adminId) => {
  const report = await findReportByIdWithAll(reportId);
  if (!report) throw new AppError("Report not found.", 404);
  if (report.reporterRole !== "mentee")
    throw new AppError("Only mentees can request refunds.", 403);
  if (report.complaintType !== "refund")
    throw new AppError("This report is not a refund request.", 400);
  if (report.refundProcessed)
    throw new AppError("Refund already processed.", 400);

  const connectRequest = report.connectRequest;
  if (!connectRequest) throw new AppError("Session not found.", 404);
  if (connectRequest.paymentStatus !== "paid")
    throw new AppError("Session has not been paid.", 400);

  const menteeId = connectRequest.mentee;
  const totalAmount = connectRequest.totalAmount || 0;

  const menteeWallet = await findWalletByUserId(menteeId);
  if (!menteeWallet) throw new AppError("Mentee wallet not found.", 404);

  const refundAmount = Math.min(totalAmount, menteeWallet.escrow);
  menteeWallet.escrow = Math.max(0, menteeWallet.escrow - refundAmount);
  menteeWallet.balance += refundAmount;
  await saveWallet(menteeWallet);

  await createTransaction({
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
  await saveReport(report);

  await createNotification({
    recipient: menteeId,
    type: "new_review",
    title: "Refund processed ✅",
    message: `Your refund of ${refundAmount} tokens has been returned to your wallet by the admin team.`,
    metadata: { requestId: connectRequest._id, amount: refundAmount },
  });

  if (report.reportedBy?.email) {
    fireAndForgetEmail(
      () =>
        sendReportResolvedEmail({
          reporterName: report.reportedBy.name,
          reporterEmail: report.reportedBy.email,
          complaintType: report.complaintType,
          status: "resolved",
          adminNote: resolvedAdminNote,
          reporterRole: report.reporterRole,
        }),
      "Admin Refund Report Resolution",
    );
  }

  return { refundAmount };
};

const deleteSessionService = async (reportId, adminNote, adminId) => {
  const report = await findReportByIdWithConnectFull(reportId);
  if (!report) throw new AppError("Report not found.", 404);
  if (!report.connectRequest)
    throw new AppError("Session not found or already deleted.", 404);

  const connectRequest = report.connectRequest;
  const menteeId = connectRequest.mentee?._id || connectRequest.mentee;
  const mentorId = connectRequest.mentor?._id || connectRequest.mentor;
  const menteeName = connectRequest.mentee?.name || "Mentee";
  const mentorName = connectRequest.mentor?.name || "Mentor";

  await deleteRequestById(connectRequest._id);

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
  await saveReport(report);

  if (report.reportedBy?.email) {
    fireAndForgetEmail(
      () =>
        sendReportResolvedEmail({
          reporterName: report.reportedBy.name,
          reporterEmail: report.reportedBy.email,
          complaintType: report.complaintType,
          status: "resolved",
          adminNote: resolvedAdminNote,
          reporterRole: report.reporterRole,
        }),
      "Admin Delete Session Report Resolution",
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
