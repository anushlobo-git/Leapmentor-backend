/**
 * @fileoverview Leap Request Data Transfer Object (DTO) Mapper
 * @description Decouples database document configurations from structural API balance elements.
 */

const toLeapRequestDTO = (leapRequest) => {
  if (!leapRequest) return null;

  return {
    // ✅ Dual-ID Support: Complete frontend backward compatibility
    _id: leapRequest._id,
    

    // Safe extraction fallback paths handle either raw ObjectIds or fully populated entities cleanly
    mentee: leapRequest.mentee?._id
      ? {
          id: leapRequest.mentee._id.toString(),
          name: leapRequest.mentee.name,
          email: leapRequest.mentee.email,
          profilePicture: leapRequest.mentee.profilePicture,
        }
      : leapRequest.mentee,

    status: leapRequest.status,
    currentBalance: leapRequest.currentBalance ?? 0,
    reviewedAt: leapRequest.reviewedAt || null,

    reviewedBy: leapRequest.reviewedBy?._id
      ? {
          id: leapRequest.reviewedBy._id.toString(),
          name: leapRequest.reviewedBy.name,
        }
      : leapRequest.reviewedBy,

    createdAt: leapRequest.createdAt,
    updatedAt: leapRequest.updatedAt,
  };
};

module.exports = { toLeapRequestDTO };
