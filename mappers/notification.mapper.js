/**
 * @fileoverview Notification Data Transfer Object (DTO) Mapper
 * @description Decouples database alert tracking records from outgoing API payload structures.
 */

const toNotificationDTO = (notification) => {
  if (!notification) return null;

  return {
    // Dual-ID Support: Complete frontend backward compatibility
    _id: notification._id,
    id: notification._id?.toString(),
    recipient:
      notification.recipient?._id?.toString() ??
      notification.recipient?.toString(),
    type: notification.type || "",
    title: notification.title || "",
    message: notification.message || "",
    read: notification.read || false,

    // Safely structure the flexible metadata container without throwing runtime errors
    metadata: notification.metadata
      ? {
          mentorId: notification.metadata.mentorId?.toString() || null,
          menteeId: notification.metadata.menteeId?.toString() || null,
          sessionId: notification.metadata.sessionId?.toString() || null,
          requestId: notification.metadata.requestId?.toString() || null,
          amount: notification.metadata.amount ?? null,
          rating: notification.metadata.rating ?? null,
        }
      : {},

    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
};

module.exports = { toNotificationDTO };
