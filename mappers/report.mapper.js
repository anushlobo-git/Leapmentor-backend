/**
 * @fileoverview Report Data Transfer Object (DTO) Mapper
 * @description Centralizes incident metadata formatting, dynamic role alignments, and dual-ID tracking contracts.
 */

const toReportDTO = (report) => {
  if (!report) return null;

  const isMenteeReporter = report.reporterRole === "mentee";
  const isMentorReporter = report.reporterRole === "mentor";

  return {
    // ✅ Dual-ID Support
    _id: report._id,
    id: report._id?.toString(),

    // Dynamic Context Resolutions: Safely matches properties based on system reporting role configurations
    mentee: isMenteeReporter
      ? report.reportedBy?.name
      : report.reportedUser?.name,
    menteeEmail: isMenteeReporter
      ? report.reportedBy?.email
      : report.reportedUser?.email,
    mentor: isMentorReporter
      ? report.reportedBy?.name
      : report.reportedUser?.name,
    mentorEmail: isMentorReporter
      ? report.reportedBy?.email
      : report.reportedUser?.email,

    reportedBy: report.reportedBy?.name || "—",
    reportedById:
      report.reportedBy?._id?.toString() ||
      report.reportedBy?.toString() ||
      null,
    reportedUser: report.reportedUser?.name || "—",
    reporterRole: report.reporterRole || "",
    category: report.complaintType || "",
    description: report.description || "",
    screenshotUrl: report.screenshotUrl || "",
    adminNote: report.adminNote || "",
    status: report.status || "open",
    refundProcessed: report.refundProcessed || false,

    // Nested Session Connection References
    connectRequestId:
      report.connectRequest?._id?.toString() ||
      report.connectRequest?.toString() ||
      null,
    sessionStatus: report.connectRequest?.status || null,
    paymentStatus: report.connectRequest?.paymentStatus || null,
    totalAmount: report.connectRequest?.totalAmount || 0,

    // Uniform ISO Date String Generation Strip-out
    date: report.createdAt
      ? new Date(report.createdAt).toISOString().split("T")[0]
      : "—",
    resolvedAt: report.resolvedAt || null,
  };
};

module.exports = { toReportDTO };
