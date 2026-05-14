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

const getUsersService = async ({
  search,
  role,
  page = 1,
  limit = 20,
  deleted,
}) => {
  const filter = {};

  filter.isDeleted = deleted === "true" ? true : { $ne: true };
  if (role && ["mentor", "mentee"].includes(role)) filter.roles = role;
  if (search && search.trim()) {
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

const getUserDetailService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const isMentor = user.roles.includes("mentor");

  const [profile, sessionCount] = await Promise.all([
    isMentor
      ? findMentorProfileByUserId(userId)
      : findMenteeProfileByUserId(userId),
    countCompletedSessionsByUser(userId),
  ]);

  return { user, profile, sessionCount };
};

const deleteUserService = async (userId) => {
  const user = await findUserByIdRaw(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  await Promise.all([
    deleteUserById(userId),
    deleteMentorProfileByUserId(userId),
    deleteMenteeProfileByUserId(userId),
    deleteManyByUser(userId),
  ]);

  return { name: user.name, email: user.email };
};

const blockUserService = async (userId) => {
  const user = await blockUser(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return { name: user.name };
};

const unblockUserService = async (userId) => {
  const user = await unblockUser(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  return { name: user.name };
};

module.exports = {
  getUsersService,
  getUserDetailService,
  deleteUserService,
  blockUserService,
  unblockUserService,
};
