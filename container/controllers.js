// ── CONTROLLER FACTORIES
const createAdminController = require("../controllers/admin.controller");
const createLeapRequestController = require("../controllers/leapRequest.controller");
const createAdminPaymentsController = require("../controllers/admin-payments.controller");
const createAdminReportsController = require("../controllers/admin-reports.controller");
const createAdminSettingsController = require("../controllers/admin-settings.controller");
const createAdminVerificationController = require("../controllers/admin-verification.controller");
const createAiController = require("../controllers/ai.controller");
const createRefreshController = require("../controllers/refresh.controller");
const createSocialAuthController = require("../controllers/socialAuth.controller");
const createGoogleAuthController = require("../controllers/googleAuth.controller");
const createLoginController = require("../controllers/login.controller");
const createRegisterController = require("../controllers/register.controller");
const createLinkedinAuthController = require("../controllers/linkedinAuth.controller");
const createAvailabilityController = require("../controllers/availability.controller");
const createConnectRequestController = require("../controllers/connectRequest.controller");
const createMentorReferController = require("../controllers/mentorRefer.controller");
const createEarningsController = require("../controllers/earnings.controller");
const createEscrowController = require("../controllers/escrow.controller");
const createFeedbackController = require("../controllers/feedback.controller");
const createForgotPasswordController = require("../controllers/forgotPassword.controller");
const createGoalController = require("../controllers/goal.controller");
const createGoogleCalendarController = require("../controllers/googleCalendar.controller");
const createInvoiceController = require("../controllers/invoice.controller");
const createMenteeProfileController = require("../controllers/menteeProfile.controller");
const createMentorProfileController = require("../controllers/mentorProfile.controller");
const createMessageController = require("../controllers/message.controller");
const createNoteController = require("../controllers/note.controller");
const createNotificationController = require("../controllers/notification.controller");
const createPrivateNoteController = require("../controllers/privateNote.controller");
const createReportController = require("../controllers/report.controller");
const createSessionController = require("../controllers/session.controller");
const createSlotLockController = require("../controllers/slotLock.controller");
const createSupportController = require("../controllers/support.controller");
const createUploadController = require("../controllers/upload.controller");
const createVerificationController = require("../controllers/verification.controller");
const createMentorSearchController = require("../controllers/mentorSearch.controller");

// ── DEPENDENCIES
const {
  jwt,
  authConfig,
  cookieUtils,
  cacheUtility,
  logger,
  authUtils,
  envConfig,
} = require("./infrastructure");

const {
  walletService,
  socialAuthService,
  linkedinAuthService,
  googleAuthService,
  authService,
  aiService,
  adminEngagementsService,
  adminStatsService,
  adminAuthService,
  adminUserManagementService,
  leapRequestService,
  adminPaymentsService,
  adminReportsService,
  adminSettingsService,
  adminVerificationService,
  availabilityService,
  connectRequestService,
  mentorReferService,
  earningsService,
  escrowService,
  feedbackService,
  forgotPasswordService,
  goalService,
  googleCalendarService,
  invoiceService,
  menteeProfileService,
  mentorProfileService,
  messageService,
  noteService,
  notificationService,
  privateNoteService,
  reportService,
  sessionService,
  slotLockService,
  supportMessageService,
  uploadService,
  verificationService,
  mentorSearchService,
} = require("./services");

// ── INSTANTIATE CONTROLLERS
const adminController = createAdminController({
  adminAuthService,
  adminStatsService,
  adminUserService: adminUserManagementService,
  adminEngagementService: adminEngagementsService,
  cacheUtility,
});

const adminPaymentsController = createAdminPaymentsController({
  adminPaymentsService,
  cacheUtility,
});

const adminReportsController = createAdminReportsController({
  adminReportsService,
  cacheUtility,
});

const adminSettingsController = createAdminSettingsController({
  adminSettingsService,
  cacheUtility,
});

const adminVerificationController = createAdminVerificationController({
  adminVerificationService,
  cacheUtility,
});

const linkedinAuthController = createLinkedinAuthController({
  linkedinAuthService,
  authUtils,
  cookieUtils,
  config: {
    linkedinClientId: envConfig.linkedinClientId,
    linkedinCallbackUrl: envConfig.linkedinCallbackUrl,
    clientUrl: envConfig.clientUrl,
  },
  logger,
});
const registerController = createRegisterController({
  authService,
  cookieUtils,
});
const loginController = createLoginController({ authService, cookieUtils });
const googleAuthController = createGoogleAuthController({
  googleAuthService,
  cookieUtils,
});
const socialAuthController = createSocialAuthController({
  socialAuthService,
  cookieUtils,
  logger,
});
const refreshController = createRefreshController({
  authUtils,
  jwt,
  config: authConfig,
});
const aiController = createAiController({ aiService });
const leapRequestController = createLeapRequestController({
  leapRequestService,
});
const availabilityController = createAvailabilityController({
  availabilityService,
});
const connectRequestController = createConnectRequestController({
  connectRequestService,
});
const mentorReferController = createMentorReferController({
  mentorReferService,
});
const earningsController = createEarningsController({ earningsService });
const escrowController = createEscrowController({ escrowService });
const feedbackController = createFeedbackController({ feedbackService });
const forgotPasswordController = createForgotPasswordController({
  forgotPasswordService,
});
const goalController = createGoalController({ goalService });
const googleCalendarController = createGoogleCalendarController({
  googleCalendarService,
});
const invoiceController = createInvoiceController({ invoiceService });
const menteeProfileController = createMenteeProfileController({
  menteeProfileService,
});
const mentorProfileController = createMentorProfileController({
  mentorProfileService,
});
const messageController = createMessageController({ messageService });
const noteController = createNoteController({ noteService });
const notificationController = createNotificationController({
  notificationService,
});
const privateNoteController = createPrivateNoteController({
  privateNoteService,
});
const reportController = createReportController({ reportService });
const sessionController = createSessionController({ sessionService });
const slotLockController = createSlotLockController({ slotLockService });
const supportController = createSupportController({supportService: supportMessageService });
const uploadController = createUploadController({ uploadService });
const verificationController = createVerificationController({
  verificationService,
});
const mentorSearchController = createMentorSearchController({
  mentorSearchService,
  cacheUtility,
});

const authControllersPacked = {
  registerController,
  loginController,
  googleAuthController,
  socialAuthController,
  refreshController,
  linkedinAuthController,
};

const connectControllersPacked = {
  connectRequestController,
  mentorReferController,
};

module.exports = {
  adminController,
  adminPaymentsController,
  adminReportsController,
  adminSettingsController,
  adminVerificationController,
  linkedinAuthController,
  registerController,
  loginController,
  googleAuthController,
  socialAuthController,
  refreshController,
  aiController,
  leapRequestController,
  availabilityController,
  connectRequestController,
  mentorReferController,
  earningsController,
  escrowController,
  feedbackController,
  forgotPasswordController,
  goalController,
  googleCalendarController,
  invoiceController,
  menteeProfileController,
  mentorProfileController,
  messageController,
  noteController,
  notificationController,
  privateNoteController,
  reportController,
  sessionController,
  slotLockController,
  supportController,
  uploadController,
  verificationController,
  mentorSearchController,
  authControllersPacked,
  connectControllersPacked,
};
