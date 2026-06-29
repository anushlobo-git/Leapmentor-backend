//Leapmentor-backend/container/repositories.js
// ── MODELS
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
const VerificationTokenModel = require("../models/VerificationToken");
const GoalModel = require("../models/Goal");
const MilestoneModel = require("../models/Milestone");
const MessageModel = require("../models/Message");
const NoteModel = require("../models/Note");
const NotificationModel = require("../models/Notification");
const PrivateNoteModel = require("../models/PrivateNote");
const SupportMessageModel = require("../models/SupportMessage");

// ── REPOSITORY FACTORIES
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
const createVerificationTokenRepository = require("../repositories/verificationToken.repository");
const createGoalRepository = require("../repositories/goal.repository");
const createMilestoneRepository = require("../repositories/milestone.repository");
const createMessageRepository = require("../repositories/message.repository");
const createNoteRepository = require("../repositories/note.repository");
const createNotificationRepository = require("../repositories/notification.repository");
const createPrivateNoteRepository = require("../repositories/privateNote.repository");
const createSupportMessageRepository = require("../repositories/supportMessage.repository");

// ── INSTANTIATE
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
const oAuthAccountRepository = createOAuthAccountRepository(OAuthAccountModel);
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

module.exports = {
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
};
