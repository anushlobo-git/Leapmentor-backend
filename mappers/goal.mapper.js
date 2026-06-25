/**
 * @fileoverview Goal Data Transfer Object (DTO) Mapper
 * @description Decouples database document states from API and websocket JSON structures.
 */

const toGoalDTO = (goal) => {
  if (!goal) return null;

  return {
    //  Dual-ID Support: Complete frontend backward compatibility
    _id: goal._id,
    
    connectRequest: goal.connectRequest,

    // Safe extraction fallback paths handle either raw ObjectIds or fully populated user bodies
    mentor: goal.mentor?._id
      ? { id: goal.mentor._id.toString(), name: goal.mentor.name }
      : goal.mentor,
    mentee: goal.mentee?._id
      ? { id: goal.mentee._id.toString(), name: goal.mentee.name }
      : goal.mentee,

    title: goal.title,
    description: goal.description || "",
    startDate: goal.startDate,
    endDate: goal.endDate,
    status: goal.status,
    createdBy: goal.createdBy?._id?.toString() ?? goal.createdBy?.toString(),
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
};

module.exports = { toGoalDTO };
