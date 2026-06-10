/**
 * @fileoverview Admin User Management Service
 * @description  Orchestrates advanced multi-profile filtering, target detail collection,
 * and cascading account deletion configurations.
 */

const AppError = require("../utils/AppError");
const {
  countUsersWithFilter,
  findUsers,
  findUserById,
  findUserByIdRaw,
  deleteUserById,
  blockUser,
  unblockUser,
} = require("../repositories/user.repository");
const {
  findMentorProfilesByUserIds,
  findMentorProfileByUserId,
  deleteMentorProfileByUserId,
} = require("../repositories/mentor.repository");
const {
  findMenteeProfilesByUserIds,
  findMenteeProfileByUserId,
  deleteMenteeProfileByUserId,
} = require("../repositories/mentee.repository");
const {
  countCompletedSessionsByUser,
  deleteManyByUser,
} = require("../repositories/connectRequest.repository");

// Fallback Constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Retrieves a detailed, paginated ledger of users cross-referenced with profile states.
 * @description Extracts basic accounts based on dynamic roles or query values, pools unique
 * identities, synchronously aggregates matching profile sub-documents, and merges them.
 * @param {Object} params             - Destructured filter params.
 * @param {string} [params.search]    - Regex-matched name or email phrase.
 * @param {string} [params.role]      - Target account role tier filter.
 * @param {number} [params.page]      - Explicit pagination offset reference index.
 * @param {number} [params.limit]     - Max entries returned per execution block.
 * @param {string} [params.deleted]   - Evaluates soft-deleted database fields.
 * @returns {Promise<Object>} Array of enriched profiles mapped alongside pagination metadata blocks.
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
  const total = await countUsersWithFilter(filter);
  const users = await findUsers(filter, { skip, limit: Number(limit) });

  const userIds = users.map((u) => u._id);
  const [mentorProfiles, menteeProfiles] = await Promise.all([
    findMentorProfilesByUserIds(userIds),
    findMenteeProfilesByUserIds(userIds),
  ]);

  const mentorMap = Object.fromEntries(
    mentorProfiles.map((p) => [p.user.toString(), p]),
  );
  const menteeMap = Object.fromEntries(
    menteeProfiles.map((p) => [p.user.toString(), p]),
  );

  const enriched = users.map((u) => ({
    ...u,
    profile: mentorMap[u._id.toString()] || menteeMap[u._id.toString()] || null,
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
 * @param {string} userId      - Targeted master user database ID.
 * @throws {AppError} 404       - If no user document maps to the target ID.
 * @returns {Promise<Object>} Combined entity containing model info, linked files, and transaction counts.
 */
const getUserDetailService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new AppError("User not found.", 404);

  const isMentor = user.roles.includes("mentor");
  const [profile, sessionCount] = await Promise.all([
    isMentor
      ? findMentorProfileByUserId(userId)
      : findMenteeProfileByUserId(userId),
    countCompletedSessionsByUser(userId),
  ]);

  return { user, profile, sessionCount };
};

/**
 * Executes a structural database cleanup cascade on an explicit user context index.
 * @description Clears parent identity data records while concurrently purging tracking matrices,
 * biographical logs, and connection chains to maintain database cleanliness.
 * @param {string} userId      - Targeted master user database ID.
 * @throws {AppError} 404       - If identity validation finds no active match.
 * @returns {Promise<Object>} Base tracking metadata validating user descriptors.
 */
const deleteUserService = async (userId) => {
  const user = await findUserByIdRaw(userId);
  if (!user) throw new AppError("User not found.", 404);

  await Promise.all([
    deleteUserById(userId),
    deleteMentorProfileByUserId(userId),
    deleteMenteeProfileByUserId(userId),
    deleteManyByUser(userId),
  ]);

  return { name: user.name, email: user.email };
};

/**
 * Toggles a soft-delete status flag to lock platform authentication.
 * @param {string} userId      - Targeted master user database ID.
 * @throws {AppError} 404       - If the update target returns empty.
 * @returns {Promise<Object>} User verification meta holding active string descriptors.
 */
const blockUserService = async (userId) => {
  const user = await blockUser(userId);
  if (!user) throw new AppError("User not found.", 404);
  return { name: user.name };
};

/**
 * Removes active tracking blocks to re-enable global system operations.
 * @param {string} userId      - Targeted master user database ID.
 * @throws {AppError} 404       - If restoration processes find no valid target.
 * @returns {Promise<Object>} User verification meta holding active string descriptors.
 */
const unblockUserService = async (userId) => {
  const user = await unblockUser(userId);
  if (!user) throw new AppError("User not found.", 404);
  return { name: user.name };
};

module.exports = {
  getUsersService,
  getUserDetailService,
  deleteUserService,
  blockUserService,
  unblockUserService,
};
