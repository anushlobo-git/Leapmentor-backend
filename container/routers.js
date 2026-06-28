// ── ROUTER FACTORIES
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
const createForgotPasswordRoutes = require("../routes/forgotPassword.routes");
const createGoalRoutes = require("../routes/goal.routes");
const createGoogleCalendarRoutes = require("../routes/googleCalendar.routes");
const createInvoiceRoutes = require("../routes/invoice.routes");
const createMenteeProfileRoutes = require("../routes/menteeProfile.routes");
const createMentorProfileRoutes = require("../routes/mentorProfile.routes");
const createMessageRoutes = require("../routes/message.routes");
const createNoteRoutes = require("../routes/note.routes");
const createNotificationRoutes = require("../routes/notification.routes");
const createPrivateNoteRoutes = require("../routes/privateNote.routes");
const createReportRoutes = require("../routes/report.routes");
const createSessionRoutes = require("../routes/session.routes");
const createSlotLockRoutes = require("../routes/slotLock.routes");
const createSupportRoutes = require("../routes/support.routes");
const createUploadRoutes = require("../routes/upload.routes");
const createUserRoutes = require("../routes/user.routes");
const createVerificationRoutes = require("../routes/verification.routes");
const createMentorSearchRoutes = require("../routes/mentorSearch.routes");

// ── DEPENDENCIES
const {
  adminAuthenticate,
  authenticate,
  requireRole,
  upload,
  cookieUtils,
  authValidations,
  connectRequestValidations,
  earningsValidations,
  escrowValidations,
  feedbackValidations,
  forgotPasswordValidations,
  goalValidations,
  googleCalendarValidations,
  invoiceValidations,
  menteeProfileValidations,
  mentorProfileValidations,
  messageValidations,
  noteValidations,
  notificationValidations,
  privateNoteValidations,
  reportValidations,
  sessionValidations,
  slotLockValidations,
  supportValidations,
  uploadValidations,
  verificationValidations,
  searchMentorsValidation,
  uploadImageConfig,
  uploadFieldsInterceptor,
} = require("./infrastructure");

const {
  adminController,
  adminPaymentsController,
  adminReportsController,
  adminSettingsController,
  adminVerificationController,
  leapRequestController,
  availabilityController,
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
  aiController,
} = require("./controllers");

// ── INSTANTIATE ROUTERS
const adminRouter = createAdminRoutes({
  adminController,
  leapRequestController,
  adminAuthenticate,
});

const adminPaymentsRouter = createAdminPaymentsRoutes({
  adminPaymentsController,
  adminAuthenticate,
});

const adminReportsRouter = createAdminReportsRoutes({
  adminReportsController,
  adminAuthenticate,
});

const adminSettingsRouter = createAdminSettingsRoutes({
  adminSettingsController,
  adminAuthenticate,
});

const adminVerificationRouter = createAdminVerificationRoutes({
  adminVerificationController,
  adminAuthenticate,
});

const leapRequestRouter = createLeapRequestRoutes({
  leapRequestController,
  authenticate,
  adminAuthenticate,
});

const aiRouter = createAiRoutes({
  aiController,
  authenticate,
});

const authRouter = createAuthRoutes({
  controllers: authControllersPacked,
  validations: authValidations,
  cookieUtils,
});

const availabilityRouter = createAvailabilityRoutes({
  availabilityController,
  authenticate,
});

const connectRequestRouter = createConnectRequestRoutes({
  controllers: connectControllersPacked,
  middlewares: { authenticate, requireRole },
  validations: connectRequestValidations,
});

const earningsRouter = createEarningsRoutes({
  earningsController,
  middlewares: { authenticate, requireRole },
  validations: earningsValidations,
});

const escrowRouter = createEscrowRoutes({
  escrowController,
  authenticate,
  validations: escrowValidations,
});

const feedbackRouter = createFeedbackRoutes({
  feedbackController,
  authenticate,
  validations: feedbackValidations,
});

const forgotPasswordRouter = createForgotPasswordRoutes({
  forgotPasswordController,
  validations: forgotPasswordValidations,
});

const goalRouter = createGoalRoutes({
  goalController,
  authenticate,
  validations: goalValidations,
});

const googleCalendarRouter = createGoogleCalendarRoutes({
  googleCalendarController,
  authenticate,
  validations: googleCalendarValidations,
});

const invoiceRouter = createInvoiceRoutes({
  invoiceController,
  authenticate,
  validations: invoiceValidations,
});

const menteeProfileRouter = createMenteeProfileRoutes({
  menteeProfileController,
  middlewares: { authenticate, requireRole },
  validations: menteeProfileValidations,
});

const mentorProfileRouter = createMentorProfileRoutes({
  mentorProfileController,
  middlewares: { authenticate, requireRole },
  validations: mentorProfileValidations,
});

const messageRouter = createMessageRoutes({
  messageController,
  authenticate,
  validations: messageValidations,
});

const noteRouter = createNoteRoutes({
  noteController,
  middlewares: { authenticate, upload },
  validations: noteValidations,
});

const notificationRouter = createNotificationRoutes({
  notificationController,
  authenticate,
  validations: notificationValidations,
});

const privateNoteRouter = createPrivateNoteRoutes({
  privateNoteController,
  authenticate,
  validations: privateNoteValidations,
});

const reportRouter = createReportRoutes({
  reportController,
  middlewares: { authenticate, requireRole, upload },
  validations: reportValidations,
});

const sessionRouter = createSessionRoutes({
  sessionController,
  authenticate,
  validations: sessionValidations,
});

const slotLockRouter = createSlotLockRoutes({
  slotLockController,
  authenticate,
  validations: slotLockValidations,
});

const supportRouter = createSupportRoutes({
  supportController,
  adminAuthenticate,
  validations: supportValidations,
});

const uploadRouter = createUploadRoutes({
  uploadController,
  authenticate,
  uploadImage: uploadImageConfig,
  uploadFields: uploadFieldsInterceptor,
  validations: uploadValidations,
});

const userRouter = createUserRoutes({ authenticate });

const verificationRouter = createVerificationRoutes({
  verificationController,
  validations: verificationValidations,
});

const mentorSearchRouter = createMentorSearchRoutes({
  mentorSearchController,
  middlewares: { authenticate, requireRole },
  validations: { searchMentorsValidation },
});

module.exports = {
  adminRouter,
  adminPaymentsRouter,
  adminReportsRouter,
  adminSettingsRouter,
  adminVerificationRouter,
  leapRequestRouter,
  aiRouter,
  authRouter,
  availabilityRouter,
  connectRequestRouter,
  earningsRouter,
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
