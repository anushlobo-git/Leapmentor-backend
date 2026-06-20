/**
 * @fileoverview Feedback Data Transfer Object (DTO) Mapper
 * @description Decouples database schema configurations from structural API review objects.
 */

const toFeedbackDTO = (feedback) => {
  if (!feedback) return null;

  return {
    // Dual-ID Support: Complete frontend backward compatibility
    _id: feedback._id,
    id: feedback._id?.toString(),
    connectRequest: feedback.connectRequest,

    //  Safe Check: Maps profile sub-fields if populated, falls back to raw identifier safely if not
    from: feedback.from?._id
      ? {
          id: feedback.from._id.toString(),
          name: feedback.from.name,
          email: feedback.from.email,
        }
      : feedback.from,

    to: feedback.to?._id
      ? {
          id: feedback.to._id.toString(),
          name: feedback.to.name,
          email: feedback.to.email,
        }
      : feedback.to,

    fromRole: feedback.fromRole,
    rating: feedback.rating,
    comment: feedback.comment || "",
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
};

module.exports = { toFeedbackDTO };
