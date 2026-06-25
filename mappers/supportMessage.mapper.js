/**
 * @fileoverview Support Message Data Transfer Object (DTO) Mapper
 * @description Decouples incoming help desk ticket records from outgoing client response models.
 */

const toSupportMessageDTO = (message) => {
  if (!message) return null;

  return {
    // ✅ Dual-ID Support: Complete frontend backward compatibility
    _id: message._id,
    

    email: message.email || "",
    subject: message.subject || "",
    message: message.message || "",
    role: message.role || "user",
    status: message.status || "open",
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

module.exports = { toSupportMessageDTO };
