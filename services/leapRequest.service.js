// services/leapRequest.service.js
const LeapRequest = require("../models/LeapRequest.model");
const Wallet = require("../models/Wallet");

// ── MENTEE ────────────────────────────────────────────────────

const getMyRequestService = async (menteeId) => {
  const request = await LeapRequest.findOne({
    mentee: menteeId,
    status: "pending",
  }).sort({ createdAt: -1 });

  if (!request) throw new Error("NO_PENDING_REQUEST");
  return request;
};

const createRequestService = async (menteeId) => {
  // block duplicate pending requests
  const existing = await LeapRequest.findOne({
    mentee: menteeId,
    status: "pending",
  });
  if (existing) throw new Error("PENDING_REQUEST_EXISTS");

  // fetch current wallet balance
  const wallet = await Wallet.findOne({ user: menteeId });
  const currentBalance = wallet?.balance ?? 0;

  // only allow if balance is below 500
  if (currentBalance >= 500) throw new Error("SUFFICIENT_BALANCE");

  const request = await LeapRequest.create({
    mentee: menteeId,
    currentBalance,
  });

  return request;
};

// ── ADMIN ─────────────────────────────────────────────────────

const getAllRequestsService = async (status) => {
  const filter = status ? { status } : {};
  const requests = await LeapRequest.find(filter)
    .populate("mentee", "name email profilePicture")
    .sort({ createdAt: -1 });
  return requests;
};

const getPendingCountService = async () => {
  const count = await LeapRequest.countDocuments({ status: "pending" });
  return count;
};

const approveRequestService = async (requestId, adminId) => {
  const request = await LeapRequest.findById(requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== "pending") throw new Error("ALREADY_PROCESSED");

  // add 500 LP to mentee wallet
  const wallet = await Wallet.findOneAndUpdate(
    { user: request.mentee },
    { $inc: { balance: 500 } },
    { new: true, upsert: true },
  );

  request.status = "approved";
  request.reviewedAt = new Date();
  request.reviewedBy = adminId;
  await request.save();

  return { newBalance: wallet.balance, request };
};

const rejectRequestService = async (requestId, adminId) => {
  const request = await LeapRequest.findById(requestId);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== "pending") throw new Error("ALREADY_PROCESSED");

  request.status = "rejected";
  request.reviewedAt = new Date();
  request.reviewedBy = adminId;
  await request.save();

  return request;
};

module.exports = {
  getMyRequestService,
  createRequestService,
  getAllRequestsService,
  getPendingCountService,
  approveRequestService,
  rejectRequestService,
};
