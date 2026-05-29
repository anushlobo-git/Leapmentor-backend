const MenteeProfile = require("../models/MenteeProfile");

const findMenteeProfilesByUserIds = (userIds) =>
  MenteeProfile.find({ user: { $in: userIds } })
    .select("user isProfileComplete isProfilePublished")
    .lean();

const findMenteeProfileByUserId = (userId) =>
  MenteeProfile.findOne({ user: userId }).lean();

const deleteMenteeProfileByUserId = (userId) =>
  MenteeProfile.findOneAndDelete({ user: userId });

module.exports = {
  findMenteeProfilesByUserIds,
  findMenteeProfileByUserId,
  deleteMenteeProfileByUserId,
};
