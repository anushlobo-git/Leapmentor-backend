/**
 * @fileoverview Report Business Logic Service
 * @description Orchestrates participant validation firewalls, processes asset streaming uploads,
 * and drives admin resolution states via dependency injection.
 */

const AppError = require("../utils/AppError");

// Upper-case Domain Architecture Constants
const MINIMUM_DESCRIPTION_LENGTH = 10;
const DEFAULT_PAGINATION_PAGE = 1;
const DEFAULT_PAGINATION_LIMIT = 20;
const ROLE_MENTOR = "mentor";
const ROLE_MENTEE = "mentee";
const CLOUDINARY_FOLDER_ROUTE = "leapmentor/reports";
const TERMINAL_STATUSES = new Set(["resolved", "dismissed"]);
const VALID_ADMIN_STATUS_POOL = new Set([
  "open",
  "under_review",
  "resolved",
  "dismissed",
]);

const createReportService = ({
  reportRepository,
  connectRequestRepository,
  toReportDTO,
  cloudinary,
  fireAndForgetEmail,
  emailUtils,
}) => {
  const { sendReportSubmittedEmail, sendReportResolvedEmail } = emailUtils;

  const _extractErrorMessage = (error) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "object") return JSON.stringify(error);
    return String(error);
  };

  const _uploadScreenshotToCloud = (fileBuffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: CLOUDINARY_FOLDER_ROUTE,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (error, result) => {
          if (error) {
            const message = _extractErrorMessage(error);
            return reject(new Error(message));
          }
          return resolve(result);
        },
      );
      stream.end(fileBuffer);
    });
  };

  const createIncidentReport = async (
    currentUser,
    bodyPayload,
    filePayload,
  ) => {
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

    const isMentee =
      connectSession.mentee.toString() === reportedById.toString();
    const isMentor =
      connectSession.mentor.toString() === reportedById.toString();

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

    const existingReport =
      await reportRepository.findReportByConnectAndReporter(
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
        const uploadedAsset = await _uploadScreenshotToCloud(
          filePayload.buffer,
        );
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

    fireAndForgetEmail(
      () =>
        sendReportSubmittedEmail({
          reporterName: currentUser.name,
          reporterEmail: currentUser.email,
          complaintType,
          description: description.trim(),
          reporterRole,
        }),
      "User Incident Report Submission Ticket Received",
    );

    return toReportDTO(report);
  };

  const getMySessionReport = async (connectRequestId, currentUserId) => {
    const report = await reportRepository.findReportByConnectAndReporter(
      connectRequestId,
      currentUserId,
    );
    return { report: toReportDTO(report) };
  };

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
      reports: reports.map(toReportDTO),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  };

  const processAdminReportUpdate = async (
    reportId,
    adminUserId,
    inputPayload,
  ) => {
    const { status, adminNote } = inputPayload;

    if (!VALID_ADMIN_STATUS_POOL.has(status)) {
      throw new AppError(
        "Invalid administrative transition status state specified",
        400,
      );
    }

    const updateFieldsMap = { status };
    if (adminNote !== undefined) updateFieldsMap.adminNote = adminNote.trim();

    if (TERMINAL_STATUSES.has(status)) {
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

    if (TERMINAL_STATUSES.has(status)) {
      fireAndForgetEmail(
        () =>
          sendReportResolvedEmail({
            reporterName: updatedReport.reportedBy.name,
            reporterEmail: updatedReport.reportedBy.email,
            complaintType: updatedReport.complaintType,
            status,
            adminNote: adminNote?.trim() || "",
          }),
        "Incident Report Admin Resolution Notification",
      );
    }

    return toReportDTO(updatedReport);
  };

  return {
    createIncidentReport,
    getMySessionReport,
    getAdminReportsDashboard,
    processAdminReportUpdate,
  };
};

module.exports = createReportService;
