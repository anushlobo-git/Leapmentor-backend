require("dotenv").config();

const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { google } = require("googleapis");
const multer = require("multer");

// ── MIDDLEWARE
const { adminAuthenticate } = require("../middleware/adminAuth");
const { authenticate, requireRole } = require("../middleware/authenticate");
const { upload, getFileType } = require("../middleware/upload.middleware");

// ── CONFIG
const redisClient = require("../config/redis");
const logger = require("../config/logger");
const { cloudinary } = require("../config/cloudinary");
const streamifier = require("streamifier");

// ── UTILS
const createAuthUtils = require("../utils/auth.utils");
const createCookieUtils = require("../utils/auth.cookies");
const createCacheUtility = require("../utils/cache");
const createNotification = require("../utils/createNotification");
const fireAndForgetEmail = require("../utils/fireAndForgetEmail");
const sendWithRetry = require("../utils/sendWithRetry");
const sendInvoiceEmail = require("../utils/sendInvoiceEmail");
const generateInvoice = require("../utils/generateInvoice");
const { generateAvailableSlots } = require("../utils/generateSlots");
const releaseEscrow = require("../utils/releaseEscrow");
const { sendCalendarInvite } = require("../utils/sendCalendarInvite");
const {
  sendConnectRequestEmail,
  sendRequestAcceptedEmail,
  sendPaymentReceivedEmail,
  sendReportSubmittedEmail,
  sendReportResolvedEmail,
  sendSlotCancelledEmail,
  sendSlotRescheduledEmail,
  sendAdditionalSlotEmail,
  sendMentorVerifiedEmail,
  sendSupportResolvedEmail,
  sendDocumentsSubmittedEmail,
} = require("../utils/sendNotificationEmail");

// ── SOCKET
const socketHandler = require("../socket/socketHandler");
const socketHandlerPacked = {
  get emitToUser() {
    try {
      return require("../socket/socketHandler").emitToUser;
    } catch {
      return null;
    }
  },
};

// ── GATEWAYS
const createAiGateway = require("../gateways/ai.gateway");

// ── MAPPERS
const { toAdminDTO } = require("../mappers/admin.mapper");
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");
const { toNotificationDTO } = require("../mappers/notification.mapper");
const { toPrivateNoteDTO } = require("../mappers/privateNote.mapper");
const { toReportDTO } = require("../mappers/report.mapper");
const { toSlotLockDTO } = require("../mappers/slotLock.mapper");
const { toSupportMessageDTO } = require("../mappers/supportMessage.mapper");

// ── VALIDATIONS
const authValidations = require("../validations/auth.validation");
const connectRequestValidations = require("../validations/connectRequest.validation");
const earningsValidations = require("../validations/earnings.validation");
const escrowValidations = require("../validations/escrow.validation");
const feedbackValidations = require("../validations/feedback.validation");
const forgotPasswordValidations = require("../validations/forgotPassword.validation");
const goalValidations = require("../validations/goal.validation");
const googleCalendarValidations = require("../validations/googleCalendar.validation");
const invoiceValidations = require("../validations/invoice.validation");
const menteeProfileValidations = require("../validations/menteeProfile.validation");
const mentorProfileValidations = require("../validations/mentorProfile.validation");
const messageValidations = require("../validations/message.validation");
const noteValidations = require("../validations/note.validation");
const notificationValidations = require("../validations/notification.validation");
const privateNoteValidations = require("../validations/privateNote.validation");
const reportValidations = require("../validations/report.validation");
const sessionValidations = require("../validations/session.validation");
const slotLockValidations = require("../validations/slotLock.validation");
const supportValidations = require("../validations/support.validation");
const uploadValidations = require("../validations/upload.validation");
const verificationValidations = require("../validations/verification.validation");
const {
  searchMentorsValidation,
} = require("../validations/mentorSearch.validation");

const envConfig = {
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
  linkedinCallbackUrl: process.env.LINKEDIN_CALLBACK_URL,
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  clientUrl: process.env.CLIENT_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  fromEmail: process.env.FROM_EMAIL,
  groqApiKey: process.env.GROQ_API_KEY,
};

// ── INSTANTIATE CONFIGS
const authConfig = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  stateSecret: process.env.STATE_SECRET || process.env.JWT_SECRET,
};
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const cookieConfig = { isProd: process.env.NODE_ENV === "production" };
const cookieUtils = createCookieUtils(cookieConfig);
const cacheUtility = createCacheUtility(redisClient, logger);
const authUtils = createAuthUtils(authConfig, jwt, crypto, googleClient);
const aiGateway = createAiGateway(process.env.GROQ_API_KEY);

// ── UPLOAD CONFIGS
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

module.exports = {
  // drivers
  axios,
  jwt,
  crypto,
  OAuth2Client,
  bcrypt,
  mongoose,
  google,
  multer,

  // middleware
  adminAuthenticate,
  authenticate,
  requireRole,
  upload,
  getFileType,

  // config
  redisClient,
  logger,
  cloudinary,
  streamifier,
  envConfig,
  // utils
  authUtils,
  cookieUtils,
  cacheUtility,
  createNotification,
  fireAndForgetEmail,
  sendWithRetry,
  sendInvoiceEmail,
  generateInvoice,
  generateAvailableSlots,
  releaseEscrow,
  sendCalendarInvite,
  sendConnectRequestEmail,
  sendRequestAcceptedEmail,
  sendPaymentReceivedEmail,
  sendReportSubmittedEmail,
  sendReportResolvedEmail,
  sendSlotCancelledEmail,
  sendSlotRescheduledEmail,
  sendAdditionalSlotEmail,
  sendMentorVerifiedEmail,
  sendSupportResolvedEmail,
  sendDocumentsSubmittedEmail,

  // socket
  socketHandler,
  socketHandlerPacked,

  // gateways
  aiGateway,

  // mappers
  toAdminDTO,
  toMentorProfileDTO,
  toNotificationDTO,
  toPrivateNoteDTO,
  toReportDTO,
  toSlotLockDTO,
  toSupportMessageDTO,

  // configs
  authConfig,
  cookieConfig,

  // upload configs
  uploadImageConfig,
  uploadFieldsInterceptor,

  // validations
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
};
