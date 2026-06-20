/**
 * @fileoverview User Data Transfer Object (DTO) Mapper
 * @description Centralizes user profile structures, role assignments, and soft-delete states.
 */

const toUserDTO = (user) => {
  if (!user) return null;

  return {
    _id: user._id,

    name: user.name || "",
    email: user.email || "",
    roles: user.roles || [],
    isEmailVerified: user.isEmailVerified || false,
    termsAccepted: user.termsAccepted || false,

    // System Event & Security Timestamps
    termsAcceptedAt: user.termsAcceptedAt || null,
    passwordChangedAt: user.passwordChangedAt || null,

    // Soft-Delete Flags
    isDeleted: user.isDeleted || false,
    deletedAt: user.deletedAt || null,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = { toUserDTO };
