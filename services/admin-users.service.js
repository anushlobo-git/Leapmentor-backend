/**
 * @fileoverview Admin User Management Service
 * @description Orchestrates advanced multi-profile filtering, target detail collection,
 * and cascading account deletion configurations. Receives injected repositories.
 */

const AppError = require("../utils/AppError");

// Mappers remain as static utility functions since they do not execute I/O operations
const { toMenteeProfileDTO } = require("../mappers/menteeProfile.mapper");
const { toMentorProfileDTO } = require("../mappers/mentorProfile.mapper");
const { toUserDTO } = require("../mappers/user.mapper");

// Fallback Constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const createAdminUserManagementService = ({
  userRepository,
  mentorProfileRepository,
  menteeProfileRepository,
  connectRequestRepository,
}) => {
  /**
   * Retrieves a detailed, paginated ledger of users cross-referenced with profile states.
   */
  const getUsersService = async ({
    search,
    role,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    deleted,
  }) => {
    const filter = {};
    filter.isDeleted = deleted === "true" ? true : { $ne: true };

    if (role && ["mentor", "mentee"].includes(role)) {
      filter.roles = role;
    }

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await userRepository.countUsersWithFilter(filter);
    const users = await userRepository.findUsers(filter, {
      skip,
      limit: Number(limit),
    });

    const userIds = users.map((u) => u._id);
    const [mentorProfiles, menteeProfiles] = await Promise.all([
      mentorProfileRepository.findMentorProfilesByUserIds(userIds),
      menteeProfileRepository.findMenteeProfilesByUserIds(userIds),
    ]);

    const mentorMap = Object.fromEntries(
      mentorProfiles.map((p) => [p.user.toString(), toMentorProfileDTO(p)]),
    );

    const menteeMap = Object.fromEntries(
      menteeProfiles.map((p) => [p.user.toString(), toMenteeProfileDTO(p)]),
    );

    const enriched = users.map((u) => ({
      ...toUserDTO(u),
      profile:
        mentorMap[u._id.toString()] || menteeMap[u._id.toString()] || null,
    }));

    return {
      users: enriched,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  };

  /**
   * Collects complete core data and session history for an isolated individual.
   */
  const getUserDetailService = async (userId) => {
    const user = await userRepository.findUserById(userId);
    if (!user) throw new AppError("User not found.", 404);

    const isMentor = user.roles.includes("mentor");
    const [profile, sessionCount] = await Promise.all([
      isMentor
        ? mentorProfileRepository.findMentorProfileByUserId(userId)
        : menteeProfileRepository.findMenteeProfileByUserId(userId),
      connectRequestRepository.countCompletedSessionsByUser(userId),
    ]);

    return {
      user: toUserDTO(user),
      profile: isMentor
        ? toMentorProfileDTO(profile)
        : toMenteeProfileDTO(profile),
      sessionCount,
    };
  };

  /**
   * Executes a structural database cleanup cascade on an explicit user context index.
   */
  const deleteUserService = async (userId) => {
    const user = await userRepository.findUserByIdRaw(userId);
    if (!user) throw new AppError("User not found.", 404);

    await Promise.all([
      userRepository.deleteUserById(userId),
      mentorProfileRepository.deleteMentorProfileByUserId(userId),
      menteeProfileRepository.deleteMenteeProfileByUserId(userId),
      connectRequestRepository.deleteManyByUser(userId),
    ]);

    return { name: user.name, email: user.email };
  };

  /**
   * Toggles a soft-delete status flag to lock platform authentication.
   */
  const blockUserService = async (userId) => {
    const user = await userRepository.blockUser(userId);
    if (!user) throw new AppError("User not found.", 404);
    return { name: user.name };
  };

  /**
   * Removes active tracking blocks to re-enable global system operations.
   */
  const unblockUserService = async (userId) => {
    const user = await userRepository.unblockUser(userId);
    if (!user) throw new AppError("User not found.", 404);
    return { name: user.name };
  };

  return {
    getUsersService,
    getUserDetailService,
    deleteUserService,
    blockUserService,
    unblockUserService,
  };
};

module.exports = createAdminUserManagementService;
