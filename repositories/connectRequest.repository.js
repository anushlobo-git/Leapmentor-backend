// repositories/connectRequest.repository.js
const mongoose = require("mongoose");
const ConnectRequest = require("../models/ConnectRequest");

const findPendingRequest = async (menteeId, mentorId) => {
  return await ConnectRequest.findOne({
    mentee:  menteeId,
    mentor:  mentorId,
    status: "pending",
  });
};

const findSlotConflict = async (mentorId, slot) => {
  return await ConnectRequest.findOne({
    mentor: mentorId,
    status: { $in: ["pending", "accepted"] },
    "selectedSlots.date":      slot.date,
    "selectedSlots.startTime": slot.startTime,
    "selectedSlots.endTime":   slot.endTime,
  });
};

const createConnectRequest = async (data) => {
  return await ConnectRequest.create(data);
};

const findRequestById = async (id) => {
  return await ConnectRequest.findById(id);
};

const findRequestByIdWithUsers = async (id) => {
  return await ConnectRequest.findById(id)
    .populate("mentee", "name email")
    .populate("mentor", "name email");
};

const findRequestByIdLean = async (id) => {
  return await ConnectRequest.findById(id)
    .populate("mentee", "name email")
    .populate("mentor", "name email")
    .lean();
};

const findMyRequests = async (menteeId) => {
  return await ConnectRequest.find({ mentee: menteeId })
    .populate("mentor", "name email")
    .populate("referredTo", "name email")
    .sort({ requestedAt: -1 })
    .lean();
};

const findIncomingRequests = (mentorId, status) => {
  const filter = { mentor: mentorId };
  if (
    status &&
    ["pending", "accepted", "rejected", "referred"].includes(status)
  ) {
    filter.status = status;
  }
  return ConnectRequest.find(filter)
    .populate("mentee", "name email")
    .populate("referredBy", "name email")
    .sort({ requestedAt: -1 })
    .lean();
};

const saveRequest = async (request) => {
  return await request.save();
};

const rejectConflictingSlots = async (requestId, mentorId, confirmedSlot) => {
  return await ConnectRequest.updateMany(
    {
      _id:    { $ne: requestId },
      mentor: mentorId,
      status: "pending",
      "selectedSlots.date":      confirmedSlot.date,
      "selectedSlots.startTime": confirmedSlot.startTime,
      "selectedSlots.endTime":   confirmedSlot.endTime,
    },
    { $set: { status: "rejected", respondedAt: new Date() } }
  );
};
const deleteRequestById = (id) => ConnectRequest.findByIdAndDelete(id);


const findExistingReferral = async (menteeId, mentorId) => {
  return await ConnectRequest.findOne({
    mentee:  menteeId,
    mentor:  mentorId,
    status: "pending",
  });
};

const findOngoingConnects = async (userId) => {
  return await ConnectRequest.find({
    status: { $in: ["ongoing", "completed"] },
    $or: [{ mentee: userId }, { mentor: userId }],
  })
    .populate("mentee", "name email")
    .populate("mentor", "name email")
    .sort({ paidAt: -1 })
    .lean();
};


const countByStatus = (status) => ConnectRequest.countDocuments({ status });

const countByFilter = (filter) => ConnectRequest.countDocuments(filter);

const findEngagements = (filter, { skip, limit }) =>
  ConnectRequest.find(filter)
    .populate("mentor", "name email")
    .populate("mentee", "name email")
    .sort({ requestedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();


const findCompletedPaidSessions = () =>
  ConnectRequest.find({
    status: "completed",
    paymentStatus: "paid",
    totalAmount: { $gt: 0 },
  })
    .select("totalAmount commissionAmount")
    .lean();

const countRefundedRequests = () =>
  ConnectRequest.countDocuments({ paymentStatus: "refunded" });

const findSessionsByMonth = (monthStart, monthEnd) =>
  ConnectRequest.find({
    status: "completed",
    completedAt: { $gte: monthStart, $lt: monthEnd },
  })
    .select("totalAmount")
    .lean();

const countByStatusValue = (status) =>
  ConnectRequest.countDocuments({ status });

const countCompletedSessionsByUser = (userId) =>
  ConnectRequest.countDocuments({
    $or: [{ mentor: userId }, { mentee: userId }],
    status: "completed",
  });

const deleteManyByUser = (userId) =>
  ConnectRequest.deleteMany({
    $or: [{ mentor: userId }, { mentee: userId }],
  });


const findBookedRequestsByMentor = (mentorId) =>
  ConnectRequest.find(
      { mentor: mentorId, status: { $in: ["pending", "accepted", "ongoing"] } },
      { selectedSlots: 1, selectedSlot: 1 },
    ).lean();


const findRequestByIdWithMentor = (id) =>
  ConnectRequest.findById(id).populate("mentor", "name email");

const findCompletedSessionsByMentor = (mentorId) =>
  ConnectRequest.find({ mentor: mentorId, status: "completed" }).lean();

const findCompletedSessionsByMentorSince = (mentorId, startDate) =>
  ConnectRequest.find({
    mentor: mentorId,
    status: "completed",
    completedAt: { $gte: startDate },
  }).lean();

const findOngoingPaidSessionsByMentor = (mentorId) =>
  ConnectRequest.find({
    mentor: mentorId,
    status: "ongoing",
    paymentStatus: "paid",
  }).lean();

const findCompletedSessionsWithMentee = (query, { skip, limit }) =>
  ConnectRequest.find(query)
    .populate("mentee", "name email")
    .select(
      "mentee confirmedSlot totalAmount paymentStatus completedAt sessionCount sessionRate",
    )
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

const countCompletedSessions = (query) => ConnectRequest.countDocuments(query);

const countPayoutHistory = (filter) => ConnectRequest.countDocuments(filter);

const findPayoutHistory = (filter, { skip, limit }) =>
  ConnectRequest.find(filter)
    .populate("mentee", "name email")
    .select("completedAt totalAmount paymentStatus confirmedSlot mentee")
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();


/**
 * Finds a connect request by ID with populated mentee and mentor info.
 * @param {string} id
 * @param {ClientSession} [session]
 * @returns {Promise<ConnectRequest|null>}
 */
const findByIdWithParticipants = (id, session) => {
  return ConnectRequest.findById(id)
    .populate("mentee", "name email")
    .populate("mentor", "name email")
    .session(session);
};

/**
 * Finds a raw connect request by ID without deep populations.
 * @param {string} id
 * @param {ClientSession} [session]
 * @returns {Promise<ConnectRequest|null>}
 */
const findByIdRaw = (id, session) => {
  return ConnectRequest.findById(id).session(session);
};

/**
 * Saves a connect request document instance to the database.
 * @param {Object} doc
 * @param {ClientSession} [session]
 * @returns {Promise<Object>}
 */
const save = (doc, session) => {
  return doc.save({ session, validateBeforeSave: false });
};

/**
 * Finds a connect request by ID with populated mentee and mentor info.
 * @param {string} id
 * @returns {Promise<ConnectRequest|null>}
 */
const findByIdWithParticipantsLean = (id) => {
  return ConnectRequest.findById(id)
    .populate("mentee", "name email")
    .populate("mentor", "name email")
    .lean();
};

/**
 * Finds a connect request document by ID.
 * @param {string} id
 * @returns {Promise<ConnectRequest|null>}
 */
const findById = (id) => {
  return ConnectRequest.findById(id).lean();
};

/**
 * Finds a connect request by ID with limited, optimized fields.
 * @param {string} id
 * @returns {Promise<ConnectRequest|null>}
 */
const findByIdForFeedback = (id) => {
  return ConnectRequest.findById(id)
    .select("mentor mentee status selectedSlots")
    .lean();
};




module.exports = {
  findPendingRequest,
  findSlotConflict,
  createConnectRequest,
  findRequestById,
  findRequestByIdWithUsers,
  findRequestByIdLean,
  findMyRequests,
  findIncomingRequests,
  saveRequest,
  rejectConflictingSlots,
  deleteRequestById,
  findExistingReferral,
  findOngoingConnects,
  findEngagements,
  countByStatus,
  countByFilter, 
  findCompletedPaidSessions,
  countRefundedRequests,
  findSessionsByMonth,
  countByStatusValue, 
  countCompletedSessionsByUser,
  deleteManyByUser, 
  findBookedRequestsByMentor,
  findRequestByIdWithMentor,
  findCompletedSessionsByMentor,
  findCompletedSessionsByMentorSince,
  findOngoingPaidSessionsByMentor,
  findCompletedSessionsWithMentee,
  countCompletedSessions,
  countPayoutHistory,
  findPayoutHistory,
  findByIdWithParticipants,
  findByIdRaw,
  save,
  findByIdWithParticipantsLean,
  findById,
  findByIdForFeedback,

};