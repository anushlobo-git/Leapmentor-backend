// services/admin.users.service.js
const User = require("../models/User");
const MentorProfile = require("../models/MentorProfile");
const MenteeProfile = require("../models/MenteeProfile");
const ConnectRequest = require("../models/ConnectRequest");

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
  const total = await User.countDocuments(filter, { ignoreIsDeleted: true });

  const users = await User.find(filter, null, { ignoreIsDeleted: true })
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const userIds = users.map((u) => u._id);

  const [mentorProfiles, menteeProfiles] = await Promise.all([
    MentorProfile.find({ user: { $in: userIds } })
      .select("user isProfileComplete isProfilePublished")
      .lean(),
    MenteeProfile.find({ user: { $in: userIds } })
      .select("user isProfileComplete isProfilePublished")
      .lean(),
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
  const user = await User.findById(userId)
    .select("-password")
    .setOptions({ ignoreIsDeleted: true })
    .lean();
  if (!user) throw new Error("USER_NOT_FOUND");

  const isMentor = user.roles.includes("mentor");

  const [profile, sessionCount] = await Promise.all([
    isMentor
      ? MentorProfile.findOne({ user: userId }).lean()
      : MenteeProfile.findOne({ user: userId }).lean(),
    ConnectRequest.countDocuments({
      $or: [{ mentor: userId }, { mentee: userId }],
      status: "completed",
    }),
  ]);

  return { user, profile, sessionCount };
};

const deleteUserService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  await Promise.all([
    User.findByIdAndDelete(userId),
    MentorProfile.findOneAndDelete({ user: userId }),
    MenteeProfile.findOneAndDelete({ user: userId }),
    ConnectRequest.deleteMany({
      $or: [{ mentor: userId }, { mentee: userId }],
    }),
  ]);

  return { name: user.name, email: user.email };
};

const blockUserService = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );
  if (!user) throw new Error("USER_NOT_FOUND");
  return { name: user.name };
};

const unblockUserService = async (userId) => {
  const user = await User.findOneAndUpdate(
    { _id: userId },
    { isDeleted: false, deletedAt: null },
    { new: true, ignoreIsDeleted: true },
  );
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
