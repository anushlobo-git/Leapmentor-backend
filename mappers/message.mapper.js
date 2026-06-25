/**
 * @fileoverview Message Data Transfer Object (DTO) Mapper
 * @description Decouples database text exchange configurations from structural API response elements.
 */

const toMessageDTO = (message) => {
  if (!message) return null;

  return {
    //  Dual-ID Support: Complete frontend backward compatibility
    _id: message._id,
    
    connectRequest:
      message.connectRequest?._id?.toString() ??
      message.connectRequest?.toString(),

    // Safe extraction fallback handles either raw sender ObjectIds or fully populated user frames uniformly
    sender: message.sender?._id
      ? {
          id: message.sender._id.toString(),
          name: message.sender.name,
          profilePicture: message.sender.profilePicture,
        }
      : message.sender?.toString(),

    content: message.content || "",
    readAt: message.readAt || null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

module.exports = { toMessageDTO };
