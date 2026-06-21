/**
 * @fileoverview Milestone Data Transfer Object (DTO) Mapper
 * @description Decouples database document configurations from API and real-time response structures.
 */

const toMilestoneDTO = (milestone) => {
  if (!milestone) return null;

  return {
    // Dual-ID Support: Complete frontend backward compatibility
    _id: milestone._id,
    

    goal: milestone.goal?._id?.toString() ?? milestone.goal?.toString(),
    connectRequest:
      milestone.connectRequest?._id?.toString() ??
      milestone.connectRequest?.toString(),
    title: milestone.title || "",
    description: milestone.description || "",
    dueDate: milestone.dueDate || null,
    isCompleted: milestone.isCompleted || false,
    completedAt: milestone.completedAt || null,
    completedBy:
      milestone.completedBy?._id?.toString() ??
      milestone.completedBy?.toString() ??
      null,
    order: milestone.order ?? 0,
    slotIndex: milestone.slotIndex ?? null,
    createdAt: milestone.createdAt,
    updatedAt: milestone.updatedAt,
  };
};

module.exports = { toMilestoneDTO };
