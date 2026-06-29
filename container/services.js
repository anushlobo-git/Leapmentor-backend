const env = require("../config/env");
// ── SERVICE FACTORIES
const createWalletService = require("../services/wallet.service");
const createSocialAuthService = require("../services/socialAuth.service");
const createLinkedinAuthService = require("../services/linkedinAuth.service");
const createGoogleAuthService = require("../services/googleAuth.service");
const createAuthService = require("../services/auth.service");
const createAiService = require("../services/ai.service");
const createAdminEngagementsService = require("../services/admin-engagements.service");
const createAdminStatsService = require("../services/admin-stats.service");
const createAdminAuthService = require("../services/admin-auth.service");
const createAdminUserManagementService = require("../services/admin-users.service");
const createLeapRequestService = require("../services/leapRequest.service");
const createAdminPaymentsService = require("../services/admin-payments.service");
const createAdminReportsService = require("../services/admin-reports.service");
const createAdminSettingsService = require("../services/admin-settings.service");
const createAdminVerificationService = require("../services/admin-verification.service");
const createAvailabilityService = require("../services/availability.service");
const createConnectRequestService = require("../services/connectRequest.service");
const createMentorReferService = require("../services/mentorRefer.service");
const createEarningsService = require("../services/earnings.service");
const createEscrowService = require("../services/escrow.service");
const createFeedbackService = require("../services/feedback.service");
const createForgotPasswordService = require("../services/forgotPassword.service");
const createGoalService = require("../services/goal.service");
const createGoogleCalendarService = require("../services/googleCalendar.service");
const createInvoiceService = require("../services/invoice.service");
const createMenteeProfileService = require("../services/menteeProfile.service");
const createMentorProfileService = require("../services/mentorProfile.service");
const createMessageService = require("../services/message.service");
const createNoteService = require("../services/note.service");
const createNotificationService = require("../services/notification.service");
const createPrivateNoteService = require("../services/privateNote.service");
const createReportService = require("../services/report.service");
const createSessionService = require("../services/session.service");
const createSlotLockService = require("../services/slotLock.service");
const createSupportMessageService = require("../services/supportMessage.service");
const createUploadService = require("../services/upload.service");
const createVerificationService = require("../services/verification.service");
const createMentorSearchService = require("../services/mentorSearch.service");

// ── DEPENDENCIES
const {
  axios,
  crypto,
  jwt,
  bcrypt,
  mongoose,
  logger,
  cloudinary,
  streamifier,
  authUtils,
  aiGateway,
  google,
  envConfig,
  createNotification,
  fireAndForgetEmail,
  sendWithRetry,
  sendInvoiceEmail,
  sendCalendarInvite,
  sendPaymentReceivedEmail,
  sendConnectRequestEmail,
  sendRequestAcceptedEmail,
  sendReportSubmittedEmail,
  sendReportResolvedEmail,
  sendSlotCancelledEmail,
  sendSlotRescheduledEmail,
  sendAdditionalSlotEmail,
  sendMentorVerifiedEmail,
  sendSupportResolvedEmail,
  sendDocumentsSubmittedEmail,
  generateInvoice,
  generateAvailableSlots,
  releaseEscrow,
  socketHandler,
  socketHandlerPacked,
  getFileType,
  //mappers
  toAdminDTO,
  toMentorProfileDTO,
  toNotificationDTO,
  toPrivateNoteDTO,
  toReportDTO,
  toSlotLockDTO,
  toSupportMessageDTO,
  toMenteeProfileDTO,
  toConnectRequestDTO,
} = require("./infrastructure");

const {
  userRepository,
  connectRequestRepository,
  adminUserRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  leapRequestRepository,
  walletRepository,
  transactionRepository,
  reportRepository,
  oAuthAccountRepository,
  availabilityRepository,
  slotLockRepository,
  feedbackRepository,
  verificationTokenRepository,
  goalRepository,
  milestoneRepository,
  messageRepository,
  noteRepository,
  notificationRepository,
  privateNoteRepository,
  supportMessageRepository,
} = require("./repositories");

// ── INSTANTIATE SERVICES
const walletService = createWalletService({
  walletRepository,
  transactionRepository,
  logger,
});

const socialAuthService = createSocialAuthService({
  userRepository,
  oauthAccountRepository: oAuthAccountRepository,
  walletService,
  authUtils,
  logger,
});

const linkedinAuthService = createLinkedinAuthService({
  socialAuthService,
  axios,
  config: {
    linkedinCallbackUrl: envConfig.linkedinCallbackUrl,
    linkedinClientId: envConfig.linkedinClientId,
    linkedinClientSecret: envConfig.linkedinClientSecret,
  },
});

const googleAuthService = createGoogleAuthService({
  userRepository,
  oAuthAccountRepository,
  walletService,
  authUtils,
  jwt,
  config: { googleClientId: envConfig.googleClientId },
  logger,
});

const authService = createAuthService({
  userRepository,
  walletService,
  authUtils,
  bcrypt,
});

const aiService = createAiService({ aiGateway });

const adminEngagementsService = createAdminEngagementsService({
  connectRequestRepository,
  userRepository,
});

const adminStatsService = createAdminStatsService({
  userRepository,
  mentorProfileRepository,
});

const adminAuthService = createAdminAuthService({
  adminUserRepository,
  jwt,
  toAdminDTO,
});

const adminUserManagementService = createAdminUserManagementService({
  userRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  connectRequestRepository,
});

const leapRequestService = createLeapRequestService({
  leapRequestRepository,
  walletRepository,
});

const adminPaymentsService = createAdminPaymentsService({
  adminUserRepository,
  connectRequestRepository,
  walletRepository,
  transactionRepository,
  userRepository,
});

const adminReportsService = createAdminReportsService({
  reportRepository,
  userRepository,
  walletRepository,
  transactionRepository,
  connectRequestRepository,
  createNotification,
  fireAndForgetEmail,
  sendReportResolvedEmail,
  toReportDTO,
});

const adminSettingsService = createAdminSettingsService({
  adminUserRepository,
  userRepository,
  connectRequestRepository,
  crypto,
});

const adminVerificationService = createAdminVerificationService({
  mentorProfileRepository,
  fireAndForgetEmail,
  sendMentorVerifiedEmail,
});

const availabilityService = createAvailabilityService({
  availabilityRepository,
  connectRequestRepository,
  slotLockRepository,
});

const connectRequestService = createConnectRequestService({
  connectRequestRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  createNotification,
  fireAndForgetEmail,
  emailUtils: { sendConnectRequestEmail, sendRequestAcceptedEmail },
  socketService: socketHandlerPacked,
  toMenteeProfileDTO,
  toMentorProfileDTO,
  toConnectRequestDTO,
  mongoose,
  logger,
});

const mentorReferService = createMentorReferService({
  connectRequestRepository,
  mentorProfileRepository,
});

const earningsService = createEarningsService({
  connectRequestRepository,
  mentorRepository: mentorProfileRepository,
  walletRepository,
  transactionRepository,
  userRepository,
});

const escrowService = createEscrowService({
  mongoose,
  adminUserRepo: adminUserRepository,
  connectRequestRepo: connectRequestRepository,
  walletRepo: walletRepository,
  transactionRepo: transactionRepository,
  mentorProfileRepo: mentorProfileRepository,
  availabilityRepo: availabilityRepository,
  fireAndForgetEmail,
  emailUtils: { sendInvoiceEmail, sendPaymentReceivedEmail },
  calendarUtils: { sendCalendarInvite },
  logger,
});

const feedbackService = createFeedbackService({
  feedbackRepo: feedbackRepository,
  connectRequestRepo: connectRequestRepository,
  mentorProfileRepo: mentorProfileRepository,
});

const forgotPasswordService = createForgotPasswordService({
  userRepo: userRepository,
  verificationTokenRepo: verificationTokenRepository,
  sendWithRetry,
  environmentConfig: { fromEmail: envConfig.fromEmail },
});

const goalService = createGoalService({
  connectRequestRepo: connectRequestRepository,
  goalRepo: goalRepository,
  milestoneRepo: milestoneRepository,
  socketHandler,
  logger,
});

const googleCalendarService = createGoogleCalendarService({
  google,
  availabilityRepository,
  logger,
  googleConfig: {
    clientId: env.google.clientId,
    clientSecret: env.google.clientSecret,
    redirectUri: env.google.redirectUri,
  },
});

const invoiceService = createInvoiceService({
  connectRequestRepository,
  adminUserRepository,
  generateInvoice,
});

const menteeProfileService = createMenteeProfileService({
  menteeProfileRepository,
});

const mentorProfileService = createMentorProfileService({
  mentorProfileRepository,
  toMentorProfileDTO,
});

const messageService = createMessageService({
  messageRepository,
  connectRequestRepository,
});

const noteService = createNoteService({
  noteRepository,
  connectRequestRepository,
  cloudinary,
  streamifier,
  getFileType,
  logger,
});

const notificationService = createNotificationService({
  notificationRepository,
  toNotificationDTO,
});

const privateNoteService = createPrivateNoteService({
  privateNoteRepository,
  connectRequestRepository,
  toPrivateNoteDTO,
});

const reportService = createReportService({
  reportRepository,
  connectRequestRepository,
  toReportDTO,
  cloudinary,
  fireAndForgetEmail,
  emailUtils: { sendReportSubmittedEmail, sendReportResolvedEmail },
});

const sessionService = createSessionService({
  mongoose,
  connectRequestRepo: connectRequestRepository,
  availabilityRepo: availabilityRepository,
  escrowService,
  releaseEscrow,
  socketHandler: socketHandlerPacked,
  emailUtils: {
    sendSlotCancelledEmail,
    sendSlotRescheduledEmail,
    sendAdditionalSlotEmail,
    fireAndForgetEmail,
  },
  generateAvailableSlots,
  logger,
});

const slotLockService = createSlotLockService({
  slotLockRepository,
  connectRequestRepository,
  toSlotLockDTO,
});

const supportMessageService = createSupportMessageService({
  supportMessageRepository,
  userRepository,
  notificationRepository,
  toSupportMessageDTO,
  fireAndForgetEmail,
  sendSupportResolvedEmail,
});

const uploadService = createUploadService({
  cloudinary,
  streamifier,
  mentorProfileRepository,
  toMentorProfileDTO,
  fireAndForgetEmail,
  sendDocumentsSubmittedEmail,
  logger,
});

const verificationService = createVerificationService({
  userRepository,
  verificationTokenRepository,
  sendWithRetry,
});

const mentorSearchService = createMentorSearchService({
  mentorSearchRepository: mentorProfileRepository,
  userRepository,
  toMentorProfileDTO,
  logger,
});

module.exports = {
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
};
