/**
 * @fileoverview ConnectRequest Data Transfer Object (DTO) Mapper
 * @description Decouples database schema from API response structure.
 */

const toConnectRequestDTO = (request) => ({
  _id: request._id,
  id: request._id?.toString(),
  mentee: request.mentee,
  mentor: request.mentor,
  message: request.message,
  selectedSlots: request.selectedSlots,
  confirmedSlot: request.confirmedSlot,
  status: request.status,

  // Referral flow
  referredTo: request.referredTo,
  referredRequestId: request.referredRequestId,
  referredBy: request.referredBy,

  // Payment & Escrow
  sessionRate: request.sessionRate,
  sessionCount: request.sessionCount,
  totalAmount: request.totalAmount,
  paymentStatus: request.paymentStatus,
  paidAt: request.paidAt,
  completedAt: request.completedAt,

  // Timestamps
  requestedAt: request.requestedAt,
  respondedAt: request.respondedAt,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,

  // Commission details
  commissionRate: request.commissionRate,
  commissionAmount: request.commissionAmount,
  mentorPayout: request.mentorPayout,

  // Additional sessions
  additionalSlots: request.additionalSlots,
});

module.exports = { toConnectRequestDTO };
