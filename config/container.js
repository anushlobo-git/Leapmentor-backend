/**
 * @fileoverview Dependency Injection Container
 * @description Centralized wiring point for the entire application graph.
 * This is the ONLY file allowed to require models, repositories, services, and routers directly.
 */

// ── 1. IMPORT INFRASTRUCTURE CONFIGS & DRIVERS
const redisClient = require("../config/redis");
const logger = require("../config/logger");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// Imports middleware and validations for auth routes
const { adminAuthenticate } = require("../middleware/adminAuth");
const { authenticate } = require("../middleware/authenticate");
const authValidations = require("../validations/auth.validation");
const { requireRole } = require("../middleware/authenticate");
const connectRequestValidations = require("../validations/connectRequest.validation");
const earningsValidations = require("../validations/earnings.validation");
const sendInvoiceEmail = require("../utils/sendInvoiceEmail");
const { sendCalendarInvite } = require("../utils/sendCalendarInvite");
const { sendPaymentReceivedEmail } = require("../utils/sendNotificationEmail");
const escrowValidations = require("../validations/escrow.validation");
const feedbackValidations = require("../validations/feedback.validation");

// Import utils
const createAuthUtils = require("../utils/auth.utils");
const createCookieUtils = require("../utils/auth.cookies");
const {
  sendConnectRequestEmail,
  sendRequestAcceptedEmail,
} = require("../utils/sendNotificationEmail");
const createNotification = require("../utils/createNotification");
const fireAndForgetEmail = require("../utils/fireAndForgetEmail");

const socketHandlerPacked = {
  get emitToUser() {
    try {
      return require("../socket/socketHandler").emitToUser;
    } catch {
      return null;
    }
  },
};

//forgotpassword
const VerificationTokenModel = require("../models/VerificationToken");
const createVerificationTokenRepository = require("../repositories/verificationToken.repository");
const createForgotPasswordService = require("../services/forgotPassword.service");
const createForgotPasswordController = require("../controllers/forgotPassword.controller");
const createForgotPasswordRoutes = require("../routes/forgotPassword.routes");
const forgotPasswordValidations = require("../validations/forgotPassword.validation");
const sendWithRetry = require("../utils/sendWithRetry");

//goal and milestone
const GoalModel = require("../models/Goal");
const MilestoneModel = require("../models/Milestone");
const createGoalRepository = require("../repositories/goal.repository");
const createMilestoneRepository = require("../repositories/milestone.repository");
const createGoalService = require("../services/goal.service");
const createGoalController = require("../controllers/goal.controller");
const createGoalRoutes = require("../routes/goal.routes");
const goalValidations = require("../validations/goal.validation");
const socketHandler = require("../socket/socketHandler");

//google calendar
const { google } = require("googleapis");
const createGoogleCalendarService = require("../services/googleCalendar.service");
const createGoogleCalendarController = require("../controllers/googleCalendar.controller");
const createGoogleCalendarRoutes = require("../routes/googleCalendar.routes");
const googleCalendarValidations = require("../validations/googleCalendar.validation");

//invoice
const createInvoiceService = require("../services/invoice.service");
const createInvoiceController = require("../controllers/invoice.controller");
const createInvoiceRoutes = require("../routes/invoice.routes");
const invoiceValidations = require("../validations/invoice.validation");
const generateInvoice = require("../utils/generateInvoice");

//menteeProfile
const createMenteeProfileService = require("../services/menteeProfile.service");
const createMenteeProfileController = require("../controllers/menteeProfile.controller");
const createMenteeProfileRoutes = require("../routes/menteeProfile.routes");
const menteeProfileValidations = require("../validations/menteeProfile.validation");

//mentorProfile
const createMentorProfileService = require("../services/mentorProfile.service");
const createMentorProfileController = require("../controllers/mentorProfile.controller");
const createMentorProfileRoutes = require("../routes/mentorProfile.routes");
const mentorProfileValidations = require("../validations/mentorProfile.validation");
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");

//message
const MessageModel = require("../models/Message");
const createMessageRepository = require("../repositories/message.repository");
const createMessageService = require("../services/message.service");
const createMessageController = require("../controllers/message.controller");
const createMessageRoutes = require("../routes/message.routes");
const messageValidations = require("../validations/message.validation");

//Note
const NoteModel = require("../models/Note");
const createNoteRepository = require("../repositories/note.repository");
const createNoteService = require("../services/note.service");
const createNoteController = require("../controllers/note.controller");
const createNoteRoutes = require("../routes/note.routes");
const noteValidations = require("../validations/note.validation");
const { upload, getFileType } = require("../middleware/upload.middleware");
const { cloudinary } = require("../config/cloudinary");
const streamifier = require("streamifier");

//Noification
const NotificationModel = require("../models/Notification");
const createNotificationRepository = require("../repositories/notification.repository");
const createNotificationService = require("../services/notification.service");
const createNotificationController = require("../controllers/notification.controller");
const createNotificationRoutes = require("../routes/notification.routes");
const notificationValidations = require("../validations/notification.validation");
const { toNotificationDTO } = require("../mappers/notification.mapper");

//PrivateNote
const PrivateNoteModel = require("../models/PrivateNote");
const createPrivateNoteRepository = require("../repositories/privateNote.repository");
const createPrivateNoteService = require("../services/privateNote.service");
const createPrivateNoteController = require("../controllers/privateNote.controller");
const createPrivateNoteRoutes = require("../routes/privateNote.routes");
const privateNoteValidations = require("../validations/privateNote.validation");
const { toPrivateNoteDTO } = require("../mappers/privateNote.mapper");

//report
const createReportService = require("../services/report.service");
const createReportController = require("../controllers/report.controller");
const createReportRoutes = require("../routes/report.routes");
const reportValidations = require("../validations/report.validation");
const { toReportDTO } = require("../mappers/report.mapper");
const {
  sendReportSubmittedEmail,
  sendReportResolvedEmail,
} = require("../utils/sendNotificationEmail");

//session
const createSessionService = require("../services/session.service");
const createSessionController = require("../controllers/session.controller");
const createSessionRoutes = require("../routes/session.routes");
const sessionValidations = require("../validations/session.validation");
const { generateAvailableSlots } = require("../utils/generateSlots");
const releaseEscrow = require("../utils/releaseEscrow");
const {
  sendSlotCancelledEmail,
  sendSlotRescheduledEmail,
  sendAdditionalSlotEmail,
} = require("../utils/sendNotificationEmail");

//slotLock
const createSlotLockService = require("../services/slotLock.service");
const createSlotLockController = require("../controllers/slotLock.controller");
const createSlotLockRoutes = require("../routes/slotLock.routes");
const slotLockValidations = require("../validations/slotLock.validation");
const { toSlotLockDTO } = require("../mappers/slotLock.mapper");

//supportMessage
const SupportMessageModel = require("../models/SupportMessage");
const createSupportMessageRepository = require("../repositories/supportMessage.repository");
const createSupportMessageService = require("../services/supportMessage.service");
const createSupportController = require("../controllers/support.controller");
const createSupportRoutes = require("../routes/support.routes");
const supportValidations = require("../validations/support.validation");
const { toSupportMessageDTO } = require("../mappers/supportMessage.mapper");
const { sendSupportResolvedEmail } = require("../utils/sendNotificationEmail");

//upload
const multer = require("multer");
const createUploadService = require("../services/upload.service");
const createUploadController = require("../controllers/upload.controller");
const createUploadRoutes = require("../routes/upload.routes");
const uploadValidations = require("../validations/upload.validation");
const {
  sendDocumentsSubmittedEmail,
} = require("../utils/sendNotificationEmail");

//verification
const createVerificationService = require("../services/verification.service");
const createVerificationController = require("../controllers/verification.controller");
const createVerificationRoutes = require("../routes/verification.routes");
const verificationValidations = require("../validations/verification.validation");

//mentorSearch
const createMentorSearchService = require("../services/mentorSearch.service");
const createMentorSearchController = require("../controllers/mentorSearch.controller");
const createMentorSearchRoutes = require("../routes/mentorSearch.routes");
const {
  searchMentorsValidation,
} = require("../validations/mentorSearch.validation");

// ── 2. IMPORT GATEWAY FACTORIES
const createAiGateway = require("../gateways/ai.gateway");

// ── 3. IMPORT MONGOOSE MODELS
const UserModel = require("../models/User");
const ConnectRequestModel = require("../models/ConnectRequest");
const AdminUserModel = require("../models/AdminUser");
const MentorProfileModel = require("../models/MentorProfile");
const MenteeProfileModel = require("../models/MenteeProfile");
const LeapRequestModel = require("../models/LeapRequest.model");
const WalletModel = require("../models/Wallet");
const TransactionModel = require("../models/Transaction");
const ReportModel = require("../models/Report");
const OAuthAccountModel = require("../models/OAuthAccount");
const AvailabilityModel = require("../models/Availability");
const SlotLockModel = require("../models/SlotLock");
const FeedbackModel = require("../models/Feedback");

// ── 4. IMPORT REPOSITORY FACTORIES
const createUserRepository = require("../repositories/user.repository");
const createConnectRequestRepository = require("../repositories/connectRequest.repository");
const createAdminUserRepository = require("../repositories/adminUser.repository");
const createMentorProfileRepository = require("../repositories/mentorProfile.repository");
const createMenteeProfileRepository = require("../repositories/menteeProfile.repository");
const createLeapRequestRepository = require("../repositories/leapRequest.repository");
const createWalletRepository = require("../repositories/wallet.repository");
const createTransactionRepository = require("../repositories/transaction.repository");
const createReportRepository = require("../repositories/report.repository");
const createOAuthAccountRepository = require("../repositories/oAuthAccount.repository");
const createAvailabilityRepository = require("../repositories/availability.repository");
const createSlotLockRepository = require("../repositories/slotLock.repository");
const createFeedbackRepository = require("../repositories/feedback.repository");

// ── 5. IMPORT SERVICE FACTORIES
const createAdminEngagementsService = require("../services/admin-engagements.service");
const createAdminAuthService = require("../services/admin-auth.service");
const createAdminStatsService = require("../services/admin-stats.service");
const createAdminUserManagementService = require("../services/admin-users.service");
const createLeapRequestService = require("../services/leapRequest.service");
const createAdminPaymentsService = require("../services/admin-payments.service");
const createAdminReportsService = require("../services/admin-reports.service");
const createAdminSettingsService = require("../services/admin-settings.service");
const createAdminVerificationService = require("../services/admin-verification.service");
const createAiService = require("../services/ai.service");
const createWalletService = require("../services/wallet.service");
const createSocialAuthService = require("../services/socialAuth.service");
const createGoogleAuthService = require("../services/googleAuth.service");
const createAuthService = require("../services/auth.service");
const createLinkedinAuthService = require("../services/linkedinAuth.service");
const createAvailabilityService = require("../services/availability.service");
const createConnectRequestService = require("../services/connectRequest.service");
const createMentorReferService = require("../services/mentorRefer.service");
const createEarningsService = require("../services/earnings.service");
const createEscrowService = require("../services/escrow.service");
const createFeedbackService = require("../services/feedback.service");

// ── 6. IMPORT CONTROLLER FACTORIES
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
const createUserRoutes = require("../routes/user.routes");

// ── 7. IMPORT ROUTER FACTORIES
const createAdminRoutes = require("../routes/admin.routes");
const createLeapRequestRoutes = require("../routes/leapRequest.routes");
const createAdminPaymentsRoutes = require("../routes/admin-payments.routes");
const createAdminReportsRoutes = require("../routes/admin-reports.routes");
const createAdminSettingsRoutes = require("../routes/admin-settings.routes");
const createAdminVerificationRoutes = require("../routes/admin-verification.routes");
const createAiRoutes = require("../routes/ai.routes");
const createAuthRoutes = require("../routes/auth.routes");
const createAvailabilityRoutes = require("../routes/availability.routes");
const createConnectRequestRoutes = require("../routes/connectRequest.routes");
const createEarningsRoutes = require("../routes/earnings.routes");
const createEscrowRoutes = require("../routes/escrow.routes");
const createFeedbackRoutes = require("../routes/feedback.routes");

// ── 8. IMPORT UTILITY FACTORIES
const createCacheUtility = require("../utils/cache");
const { sendMentorVerifiedEmail } = require("../utils/sendNotificationEmail");

// WIRING ASSEMBLY SEQUENCE

// A. Prepare Configuration Block & Third-Party Classes
const authConfig = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  stateSecret: process.env.STATE_SECRET || process.env.JWT_SECRET,
};
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const cookieConfig = {
  isProd: process.env.NODE_ENV === "production",
};

const cookieUtils = createCookieUtils(cookieConfig);

// STEP 1: Utilities (Instantiated first so downstream blocks can consume them)
const cacheUtility = createCacheUtility(redisClient, logger);
const authUtils = createAuthUtils(authConfig, jwt, crypto, googleClient);

// STEP 2: Repositories
const oAuthAccountRepository = createOAuthAccountRepository(OAuthAccountModel);
const userRepository = createUserRepository(UserModel);
const connectRequestRepository =
  createConnectRequestRepository(ConnectRequestModel);
const adminUserRepository = createAdminUserRepository(AdminUserModel);
const mentorProfileRepository =
  createMentorProfileRepository(MentorProfileModel);
const menteeProfileRepository =
  createMenteeProfileRepository(MenteeProfileModel);
const leapRequestRepository = createLeapRequestRepository(LeapRequestModel);
const walletRepository = createWalletRepository(WalletModel);
const transactionRepository = createTransactionRepository(TransactionModel);
const reportRepository = createReportRepository(ReportModel);
const availabilityRepository = createAvailabilityRepository(AvailabilityModel);
const slotLockRepository = createSlotLockRepository(SlotLockModel);
const feedbackRepository = createFeedbackRepository(FeedbackModel);
const verificationTokenRepository = createVerificationTokenRepository(
  VerificationTokenModel,
);
const goalRepository = createGoalRepository(GoalModel);
const milestoneRepository = createMilestoneRepository(MilestoneModel);
const messageRepository = createMessageRepository(MessageModel);
const noteRepository = createNoteRepository(NoteModel);
const notificationRepository = createNotificationRepository(NotificationModel);
const privateNoteRepository = createPrivateNoteRepository(PrivateNoteModel);
const supportMessageRepository =
  createSupportMessageRepository(SupportMessageModel);

// STEP 3: External Gateways (Instantiated before services so they can be injected)
const aiGateway = createAiGateway(process.env.GROQ_API_KEY);

// STEP 4: Services (Carefully sorted to satisfy parameters sequentially)

// 1. Core Financial Ledger (Zero inter-service dependencies)
const walletService = createWalletService(
  walletRepository,
  transactionRepository,
  logger,
);

// 2. Base Shared Social Handler (Requires verified walletService)
const socialAuthService = createSocialAuthService(
  userRepository,
  oAuthAccountRepository,
  walletService,
  authUtils,
  logger,
);

// 3. Provider Extensions (Requires socialAuthService)
const linkedinAuthService = createLinkedinAuthService(
  socialAuthService,
  axios,
  {
    linkedinCallbackUrl: process.env.LINKEDIN_CALLBACK_URL,
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },
);

const googleAuthService = createGoogleAuthService(
  userRepository,
  oAuthAccountRepository,
  walletService,
  authUtils,
  jwt,
  { googleClientId: process.env.GOOGLE_CLIENT_ID },
  logger,
);

// 4. Standard Identity and Infrastructure Services
const authService = createAuthService(
  userRepository,
  walletService,
  authUtils,
  bcrypt,
);

const aiService = createAiService(aiGateway);

const adminEngagementsService = createAdminEngagementsService(
  connectRequestRepository,
  userRepository,
);
const adminStatsService = createAdminStatsService(
  userRepository,
  mentorProfileRepository,
);
const adminAuthService = createAdminAuthService(adminUserRepository);
const adminUserManagementService = createAdminUserManagementService(
  userRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  connectRequestRepository,
);
const leapRequestService = createLeapRequestService(
  leapRequestRepository,
  walletRepository,
);
const adminPaymentsService = createAdminPaymentsService(
  adminUserRepository,
  connectRequestRepository,
  walletRepository,
  transactionRepository,
  userRepository,
);
const adminReportsService = createAdminReportsService(
  reportRepository,
  userRepository,
  walletRepository,
  transactionRepository,
  connectRequestRepository,
  createNotification,
  fireAndForgetEmail,
  sendReportResolvedEmail,
);
const adminSettingsService = createAdminSettingsService(
  adminUserRepository,
  userRepository,
  connectRequestRepository,
);
const adminVerificationService = createAdminVerificationService(
  mentorProfileRepository,
  fireAndForgetEmail,
  sendMentorVerifiedEmail,
);
const availabilityService = createAvailabilityService(
  availabilityRepository,
  connectRequestRepository,
  slotLockRepository,
);
const connectRequestService = createConnectRequestService(
  connectRequestRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  createNotification,
  fireAndForgetEmail,
  { sendConnectRequestEmail, sendRequestAcceptedEmail },
  socketHandlerPacked,
  logger,
);
const mentorReferService = createMentorReferService(
  connectRequestRepository,
  mentorProfileRepository,
);
const earningsService = createEarningsService(
  connectRequestRepository,
  mentorProfileRepository,
  walletRepository,
  transactionRepository,
  userRepository,
);
const escrowService = createEscrowService(
  mongoose,
  adminUserRepository, // Verify parameter names match your core definitions
  connectRequestRepository,
  walletRepository,
  transactionRepository,
  mentorProfileRepository,
  availabilityRepository,
  fireAndForgetEmail,
  { sendInvoiceEmail, sendPaymentReceivedEmail },
  { sendCalendarInvite },
  logger,
);
const feedbackService = createFeedbackService(
  feedbackRepository,
  connectRequestRepository,
  mentorProfileRepository,
);
const forgotPasswordService = createForgotPasswordService(
  userRepository,
  verificationTokenRepository,
  sendWithRetry,
  { fromEmail: process.env.FROM_EMAIL },
);
const goalService = createGoalService(
  connectRequestRepository,
  goalRepository,
  milestoneRepository,
  socketHandler,
  logger,
);
const googleCalendarService = createGoogleCalendarService(
  google,
  availabilityRepository,
  logger,
);
const invoiceService = createInvoiceService(
  connectRequestRepository,
  adminUserRepository,
  generateInvoice,
);
const menteeProfileService = createMenteeProfileService(
  menteeProfileRepository,
);
const mentorProfileService = createMentorProfileService(
  mentorProfileRepository,
  toMentorProfileDTO,
);
const messageService = createMessageService(
  messageRepository,
  connectRequestRepository,
);
const noteService = createNoteService(
  noteRepository,
  connectRequestRepository,
  cloudinary,
  streamifier,
  getFileType,
  logger,
);
const notificationService = createNotificationService(
  notificationRepository,
  toNotificationDTO,
);
const privateNoteService = createPrivateNoteService(
  privateNoteRepository,
  connectRequestRepository,
  toPrivateNoteDTO,
);
const reportService = createReportService(
  reportRepository,
  connectRequestRepository,
  toReportDTO,
  cloudinary,
  fireAndForgetEmail,
  { sendReportSubmittedEmail, sendReportResolvedEmail },
);
const sessionService = createSessionService(
  mongoose,
  connectRequestRepository,
  availabilityRepository,
  escrowService,
  releaseEscrow,
  socketHandler, // Inject your real socket provider context reference mapping
  {
    sendSlotCancelledEmail,
    sendSlotRescheduledEmail,
    sendAdditionalSlotEmail,
    fireAndForgetEmail,
  },
  generateAvailableSlots,
  logger,
);
const slotLockService = createSlotLockService(
  slotLockRepository, // Verify this matches your repository reference key in container
  connectRequestRepository,
  toSlotLockDTO,
);
const supportMessageService = createSupportMessageService(
  supportMessageRepository,
  userRepository,
  notificationRepository,
  toSupportMessageDTO,
  fireAndForgetEmail,
  sendSupportResolvedEmail,
);
const uploadService = createUploadService(
  cloudinary,
  streamifier,
  mentorProfileRepository,
  toMentorProfileDTO,
  fireAndForgetEmail,
  sendDocumentsSubmittedEmail,
  logger,
);
const verificationService = createVerificationService(
  userRepository,
  verificationTokenRepository, // Formatted repository reference from forgotPassword layer
  sendWithRetry,
);
const mentorSearchService = createMentorSearchService(
  mentorProfileRepository,
  userRepository,
  toMentorProfileDTO,
  logger,
);

// STEP 5: Controllers

const linkedinAuthController = createLinkedinAuthController(
  linkedinAuthService,
  authUtils,
  cookieUtils,
  {
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
    linkedinCallbackUrl: process.env.LINKEDIN_CALLBACK_URL,
    clientUrl: process.env.CLIENT_URL,
  },
  logger,
);

const registerController = createRegisterController(authService, cookieUtils);
const loginController = createLoginController(authService, cookieUtils);
const googleAuthController = createGoogleAuthController(
  googleAuthService,
  cookieUtils,
);
const socialAuthController = createSocialAuthController(
  socialAuthService,
  cookieUtils,
  logger,
);
const refreshController = createRefreshController(authUtils, jwt, authConfig);
const aiController = createAiController(aiService);

const adminController = createAdminController(
  adminAuthService,
  adminStatsService,
  adminUserManagementService,
  adminEngagementsService,
  cacheUtility,
);
const leapRequestController = createLeapRequestController(leapRequestService);
const adminPaymentsController = createAdminPaymentsController(
  adminPaymentsService,
  cacheUtility,
);
const adminReportsController = createAdminReportsController(
  adminReportsService,
  cacheUtility,
);
const adminSettingsController = createAdminSettingsController(
  adminSettingsService,
  cacheUtility,
);
const adminVerificationController = createAdminVerificationController(
  adminVerificationService,
  cacheUtility,
);

const authControllersPacked = {
  registerController,
  loginController,
  googleAuthController,
  socialAuthController,
  refreshController,
  linkedinAuthController,
};
const availabilityController =
  createAvailabilityController(availabilityService);

const connectRequestController = createConnectRequestController(
  connectRequestService,
);

const mentorReferController = createMentorReferController(mentorReferService);
const connectControllersPacked = {
  connectRequestController,
  mentorReferController,
};

const connectMiddlewaresPacked = {
  authenticate,
  requireRole,
};
const earningsController = createEarningsController(earningsService);
const escrowController = createEscrowController(escrowService);
const feedbackController = createFeedbackController(feedbackService);
const forgotPasswordController = createForgotPasswordController(
  forgotPasswordService,
);
const goalController = createGoalController(goalService);
const googleCalendarController = createGoogleCalendarController(
  googleCalendarService,
);
const invoiceController = createInvoiceController(invoiceService);
const menteeProfileController =
  createMenteeProfileController(menteeProfileService);
const mentorProfileController =
  createMentorProfileController(mentorProfileService);
const messageController = createMessageController(messageService);
const noteController = createNoteController(noteService);
const notificationController =
  createNotificationController(notificationService);
const privateNoteController = createPrivateNoteController(privateNoteService);
const reportController = createReportController(reportService);
const sessionController = createSessionController(sessionService);
const slotLockController = createSlotLockController(slotLockService);
const supportController = createSupportController(supportMessageService);
const uploadController = createUploadController(uploadService);
const verificationController =
  createVerificationController(verificationService);
const mentorSearchController = createMentorSearchController(
  mentorSearchService,
  cacheUtility,
);

// STEP 6: Routers (Fully compiled pipelines ready for app.js mounting)

const aiRouter = createAiRoutes(aiController, authenticate);
const adminVerificationRouter = createAdminVerificationRoutes(
  adminVerificationController,
  adminAuthenticate,
);
const adminRouter = createAdminRoutes(
  adminController,
  leapRequestController,
  adminAuthenticate,
);
const leapRequestRouter = createLeapRequestRoutes(
  leapRequestController,
  authenticate,
  adminAuthenticate,
);
const adminPaymentsRouter = createAdminPaymentsRoutes(
  adminPaymentsController,
  adminAuthenticate,
);
const adminReportsRouter = createAdminReportsRoutes(
  adminReportsController,
  adminAuthenticate,
);
const adminSettingsRouter = createAdminSettingsRoutes(
  adminSettingsController,
  adminAuthenticate,
);
const authRouter = createAuthRoutes(
  authControllersPacked,
  authValidations,
  cookieUtils,
);
const availabilityRouter = createAvailabilityRoutes(
  availabilityController,
  authenticate,
);
const connectRequestRouter = createConnectRequestRoutes(
  connectControllersPacked,
  connectMiddlewaresPacked,
  connectRequestValidations,
);
const earningsMiddlewaresPacked = {
  authenticate,
  requireRole,
};

const earningsRouter = createEarningsRoutes(
  earningsController,
  earningsMiddlewaresPacked,
  earningsValidations,
);

const escrowRouter = createEscrowRoutes(
  escrowController,
  authenticate,
  escrowValidations,
);
const feedbackRouter = createFeedbackRoutes(
  feedbackController,
  authenticate,
  feedbackValidations,
);
const forgotPasswordRouter = createForgotPasswordRoutes(
  forgotPasswordController,
  forgotPasswordValidations,
);
const goalRouter = createGoalRoutes(
  goalController,
  authenticate,
  goalValidations,
);
const googleCalendarRouter = createGoogleCalendarRoutes(
  googleCalendarController,
  authenticate,
  googleCalendarValidations,
);
const invoiceRouter = createInvoiceRoutes(
  invoiceController,
  authenticate,
  invoiceValidations,
);
const menteeMiddlewaresPacked = {
  authenticate,
  requireRole,
};

const menteeProfileRouter = createMenteeProfileRoutes(
  menteeProfileController,
  menteeMiddlewaresPacked,
  menteeProfileValidations,
);
const mentorMiddlewaresPacked = {
  authenticate,
  requireRole,
};

const mentorProfileRouter = createMentorProfileRoutes(
  mentorProfileController,
  mentorMiddlewaresPacked,
  mentorProfileValidations,
);
const messageRouter = createMessageRoutes(
  messageController,
  authenticate,
  messageValidations,
);
const noteMiddlewaresPacked = {
  authenticate,
  upload,
};

const noteRouter = createNoteRoutes(
  noteController,
  noteMiddlewaresPacked,
  noteValidations,
);
const notificationRouter = createNotificationRoutes(
  notificationController,
  authenticate,
  notificationValidations,
);
const privateNoteRouter = createPrivateNoteRoutes(
  privateNoteController,
  authenticate,
  privateNoteValidations,
);

const reportMiddlewaresPacked = {
  authenticate,
  requireRole,
  upload,
};

const reportRouter = createReportRoutes(
  reportController,
  reportMiddlewaresPacked,
  reportValidations,
);
const sessionRouter = createSessionRoutes(
  sessionController,
  authenticate,
  sessionValidations,
);
const slotLockRouter = createSlotLockRoutes(
  slotLockController,
  authenticate,
  slotLockValidations,
);
const supportRouter = createSupportRoutes(
  supportController,
  adminAuthenticate,
  supportValidations,
);

//upload
const uploadImageConfig = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadFieldsInterceptor = upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "workExperienceDocs", maxCount: 3 },
]);

const uploadRouter = createUploadRoutes(
  uploadController,
  authenticate,
  uploadImageConfig,
  uploadFieldsInterceptor,
  uploadValidations,
);

const userRouter = createUserRoutes(authenticate);
const verificationRouter = createVerificationRoutes(
  verificationController,
  verificationValidations,
);
const searchMiddlewaresPacked = {
  authenticate,
  requireRole,
};

const searchValidationsPacked = {
  searchMentorsValidation,
};

const mentorSearchRouter = createMentorSearchRoutes(
  mentorSearchController,
  searchMiddlewaresPacked,
  searchValidationsPacked,
);

// CONTAINER EXPORTS

module.exports = {
  cacheUtility,
  oAuthAccountRepository,
  userRepository,
  connectRequestRepository,
  adminUserRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  leapRequestRepository,
  walletRepository,
  transactionRepository,
  reportRepository,
  adminEngagementsService,
  adminAuthService,
  adminStatsService,
  walletService,
  adminUserManagementService,
  leapRequestService,
  adminPaymentsService,
  adminReportsService,
  cookieUtils,
  adminSettingsService,
  adminController,
  leapRequestController,
  adminPaymentsController,
  adminReportsController,
  adminSettingsController,
  adminRouter,
  leapRequestRouter,
  adminPaymentsRouter,
  adminReportsRouter,
  adminSettingsRouter,
  adminVerificationService,
  adminVerificationController,
  adminVerificationRouter,
  aiGateway,
  aiService,
  aiController,
  aiRouter,
  authUtils,
  refreshController,
  socialAuthService,
  socialAuthController,
  googleAuthService,
  googleAuthController,
  authService,
  loginController,
  registerController,
  authRouter,
  linkedinAuthController,
  linkedinAuthService,
  availabilityRepository,
  slotLockRepository,
  availabilityService,
  availabilityController,
  availabilityRouter,
  connectRequestService,
  connectRequestController,
  mentorReferService,
  mentorReferController,
  connectRequestRouter,
  earningsService,
  earningsController,
  earningsRouter,
  escrowService,
  escrowController,
  escrowRouter,
  feedbackRouter,
  forgotPasswordRouter,
  goalRouter,
  googleCalendarRouter,
  invoiceRouter,
  menteeProfileRouter,
  mentorProfileRouter,
  messageRouter,
  noteRouter,
  notificationRouter,
  privateNoteRouter,
  reportRouter,
  sessionRouter,
  slotLockRouter,
  supportRouter,
  uploadRouter,
  userRouter,
  verificationRouter,
  mentorSearchRouter,
};
