/**
 * @fileoverview Report Business Logic Service
 * @description Orchestrates participant validation firewalls, processes asset streaming uploads, and drives admin resolution states.
 */
const { cloudinary } = require("../config/cloudinary");
const AppError = require("../utils/AppError");

// Repositories
const reportRepository = require("../repositories/report.repository");
const connectRequestRepository = require("../repositories/connectRequest.repository");

// Out-of-band Notification Helpers
const {
  sendReportSubmittedEmail,
  sendReportResolvedEmail,
} = require("../utils/sendNotificationEmail");

// Upper-case Domain Architecture Constants
const MINIMUM_DESCRIPTION_LENGTH = 10;
const DEFAULT_PAGINATION_PAGE = 1;
const DEFAULT_PAGINATION_LIMIT = 20;
const ROLE_MENTOR = "mentor";
const ROLE_MENTEE = "mentee";
const CLOUDINARY_FOLDER_ROUTE = "leapmentor/reports";
const TERMINAL_STATUSES = ["resolved", "dismissed"];
const VALID_ADMIN_STATUS_POOL = [
  "open",
  "under_review",
  "resolved",
  "dismissed",
];

/**
 * Internal Helper: Channels multipart asset file buffers safely to Cloudinary buckets.
 */
const uploadScreenshotToCloud = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER_ROUTE,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(fileBuffer);
  });
};

/**
 * Validates contractual alignment boundaries and creates a fresh incident ticket.
 * @param {Object} currentUser - Active authenticated user entity context tracking.
 * @param {Object} bodyPayload - Request body segments containing context IDs and content.
 * @param {Object} filePayload - Memory upload document block parameters.
 * @throws {AppError} 400 | 403 | 404 | 409
 * @returns {Promise<Object>} Formatted report object data.
 */
const createIncidentReport = async (currentUser, bodyPayload, filePayload) => {
  const { connectRequestId, complaintType, description } = bodyPayload;
  const reportedById = currentUser._id;

  if (!connectRequestId || !complaintType || !description) {
    throw new AppError(
      "connectRequestId, complaintType, and description fields are required properties",
      400,
    );
  }

  if (description.trim().length < MINIMUM_DESCRIPTION_LENGTH) {
    throw new AppError(
      `Description payload metrics must encompass at least ${MINIMUM_DESCRIPTION_LENGTH} characters`,
      400,
    );
  }

  const connectSession =
    await connectRequestRepository.findById(connectRequestId);
  if (!connectSession) {
    throw new AppError(
      "Target session request identifier missing from database records",
      404,
    );
  }

  const isMentee = connectSession.mentee.toString() === reportedById.toString();
  const isMentor = connectSession.mentor.toString() === reportedById.toString();

  if (!isMentee && !isMentor) {
    throw new AppError(
      "Access denied: You are not an active participant inside this contract request session",
      403,
    );
  }

  const reporterRole = isMentee ? ROLE_MENTEE : ROLE_MENTOR;
  const reportedUserId = isMentee
    ? connectSession.mentor
    : connectSession.mentee;

  const existingReport = await reportRepository.findReportByConnectAndReporter(
    connectRequestId,
    reportedById,
  );
  if (existingReport) {
    throw new AppError(
      "Conflict mapping constraint: You have already submitted an active ticket trace matching this session context",
      409,
    );
  }

  let screenshotUrl = "";
  let screenshotPublicId = "";

  if (filePayload) {
    try {
      const uploadedAsset = await uploadScreenshotToCloud(filePayload.buffer);
      screenshotUrl = uploadedAsset.secure_url;
      screenshotPublicId = uploadedAsset.public_id;
    } catch (uploadError) {
      throw new AppError(
        `Image streaming infrastructure failure: ${uploadError.message}`,
        400,
      );
    }
  }

  const report = await reportRepository.create({
    connectRequest: connectRequestId,
    reportedBy: reportedById,
    reportedUser: reportedUserId,
    reporterRole,
    complaintType,
    description: description.trim(),
    screenshotUrl,
    screenshotPublicId,
  });

  // Non-blocking asynchronous email processing chain keeps client gateway speeds decoupled
  sendReportSubmittedEmail({
    reporterName: currentUser.name,
    reporterEmail: currentUser.email,
    complaintType,
    description: description.trim(),
    reporterRole,
  }).catch((emailError) =>
    console.error(
      "❌ sendReportSubmittedEmail fire-and-forget loop broke:",
      emailError.message,
    ),
  );

  return report;
};

/**
 * Resolves isolated, single report files matching requesting identities context maps.
 */
const getMySessionReport = async (connectRequestId, currentUserId) => {
  const report = await reportRepository.findReportByConnectAndReporter(
    connectRequestId,
    currentUserId,
  );
  return { report: report || null };
};

/**
 * Compiles a paginated dashboard checklist containing all active or historical system report vectors.
 */
const getAdminReportsDashboard = async (queryParams) => {
  const {
    status,
    page = DEFAULT_PAGINATION_PAGE,
    limit = DEFAULT_PAGINATION_LIMIT,
  } = queryParams;

  const filter = {};
  if (status) filter.status = status;

  const pageNum = Number(page) || DEFAULT_PAGINATION_PAGE;
  const limitNum = Number(limit) || DEFAULT_PAGINATION_LIMIT;
  const skip = (pageNum - 1) * limitNum;

  const [total, reports] = await Promise.all([
    reportRepository.countReportsByFilter(filter),
    reportRepository.findReports(filter, { skip, limit: limitNum }),
  ]);

  return {
    reports,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Drives core administrative data changes, updating resolutions tracking matrices.
 * @throws {AppError} 400 | 404
 */
const processAdminReportUpdate = async (
  reportId,
  adminUserId,
  inputPayload,
) => {
  const { status, adminNote } = inputPayload;

  if (!VALID_ADMIN_STATUS_POOL.includes(status)) {
    throw new AppError(
      "Invalid administrative transition status state specified",
      400,
    );
  }

  const updateFieldsMap = { status };
  if (adminNote !== undefined) updateFieldsMap.adminNote = adminNote.trim();

  if (TERMINAL_STATUSES.includes(status)) {
    updateFieldsMap.resolvedAt = new Date();
    updateFieldsMap.resolvedBy = adminUserId;
  }

  const updatedReport = await reportRepository.updateReportWithUsers(
    reportId,
    updateFieldsMap,
  );
  if (!updatedReport) {
    throw new AppError(
      "Target report document identity key reference missing from indices",
      404,
    );
  }

  if (TERMINAL_STATUSES.includes(status)) {
    sendReportResolvedEmail({
      reporterName: updatedReport.reportedBy.name,
      reporterEmail: updatedReport.reportedBy.email,
      complaintType: updatedReport.complaintType,
      status,
      adminNote: adminNote?.trim() || "",
    }).catch((emailError) =>
      console.error(
        "❌ sendReportResolvedEmail async transmission failure:",
        emailError.message,
      ),
    );
  }

  return updatedReport;
};

module.exports = {
  createIncidentReport,
  getMySessionReport,
  getAdminReportsDashboard,
  processAdminReportUpdate,
};
