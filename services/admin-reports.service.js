/**
 * @fileoverview Admin Reports Orchestration Service
 * @description Manages workflow transitions, multi-party notification triggers,
 * escrow wallet balances corrections, and support ticket states.
 */

const AppError = require("../utils/AppError");
const { toReportDTO } = require("../mappers/report.mapper");

const createAdminReportsService = (
  reportRepository,
  userRepository,
  walletRepository,
  transactionRepository,
  connectRequestRepository,
  createNotification,
  fireAndForgetEmail,
  sendReportResolvedEmail,
) => {
  const getReportStatsService = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalReports, pendingResolution, resolvedToday] = await Promise.all([
      reportRepository.countAllReports(),
      reportRepository.countReportsByFilter({
        status: { $in: ["open", "under_review"] },
      }),
      reportRepository.countReportsByFilter({
        status: "resolved",
        resolvedAt: { $gte: today },
      }),
    ]);

    return { totalReports, pendingResolution, resolvedToday };
  };

  const getReportsService = async ({ page, limit, search, status }) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(20, parseInt(limit, 10) || 10);
    const skip = (safePage - 1) * safeLimit;

    const filter = {};
    if (status) filter.status = status;

    if (search?.trim()) {
      const matchingUsers = await userRepository.findUsersByName(search.trim());
      const userIds = matchingUsers.map((u) => u._id);
      filter.$or = [
        { reportedBy: { $in: userIds } },
        { reportedUser: { $in: userIds } },
      ];
    }

    const [totalCount, reports] = await Promise.all([
      reportRepository.countReportsByFilter(filter),
      reportRepository.findReports(filter, { skip, limit: safeLimit }),
    ]);

    return {
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
    if (!["resolved", "dismissed"].includes(status)) {
      throw new AppError("Status must be resolved or dismissed.", 400);
    }

    const report = await reportRepository.findReportByIdWithUsers(reportId);
    if (!report) throw new AppError("Report not found.", 404);

    report.status = status;
    report.adminNote = adminNote?.trim() || report.adminNote;
    report.resolvedAt = new Date();
    report.resolvedBy = adminId;
    await reportRepository.saveReport(report);

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
    const report = await reportRepository.findReportByIdWithAll(reportId);
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

    const menteeWallet = await walletRepository.findWalletByUserId(menteeId);
    if (!menteeWallet) throw new AppError("Mentee wallet not found.", 404);

    const refundAmount = Math.min(totalAmount, menteeWallet.escrow);
    menteeWallet.escrow = Math.max(0, menteeWallet.escrow - refundAmount);
    menteeWallet.balance += refundAmount;
    await walletRepository.saveWallet(menteeWallet);

    await transactionRepository.createTransaction({
      user: menteeId,
      type: "escrow_refund",
      amount: refundAmount,
      description: "Admin refund — report resolved",
      balanceAfter: menteeWallet.balance,
      connectRequest: connectRequest._id,
    });

    connectRequest.paymentStatus = "refunded";
    connectRequest.status = "rejected";
    await connectRequest.save(); // Directly save the instance model context

    const resolvedAdminNote = adminNote?.trim() || "Refund processed by admin.";
    report.refundProcessed = true;
    report.refundedAt = new Date();
    report.status = "resolved";
    report.resolvedAt = new Date();
    report.resolvedBy = adminId;
    report.adminNote = resolvedAdminNote;
    await reportRepository.saveReport(report);

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
    const report =
      await reportRepository.findReportByIdWithConnectFull(reportId);
    if (!report) throw new AppError("Report not found.", 404);
    if (!report.connectRequest)
      throw new AppError("Session not found or already deleted.", 404);

    const connectRequest = report.connectRequest;
    const menteeId = connectRequest.mentee?._id || connectRequest.mentee;
    const mentorId = connectRequest.mentor?._id || connectRequest.mentor;
    const menteeName = connectRequest.mentee?.name || "Mentee";
    const mentorName = connectRequest.mentor?.name || "Mentor";

    await connectRequestRepository.deleteRequestById(connectRequest._id);

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
    await reportRepository.saveReport(report);
  };

  return {
    getReportStatsService,
    getReportsService,
    handleReportService,
    processRefundService,
    deleteSessionService,
  };
};

module.exports = createAdminReportsService;
