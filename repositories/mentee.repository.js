const MenteeProfile = require("../models/MenteeProfile");

const findMenteeProfilesByUserIds = (userIds) =>
  MenteeProfile.find({ user: { $in: userIds } })
    .select("user isProfileComplete isProfilePublished")
    .lean();

const findMenteeProfileByUserId = (userId) =>
  MenteeProfile.findOne({ user: userId }).lean();

const deleteMenteeProfileByUserId = (userId) =>
  MenteeProfile.findOneAndDelete({ user: userId });

const findMenteeProfile = (userId) =>
  MenteeProfile.findOne({ user: userId })
    .select("currentRole company profilePicture skills bio interestedFields")
    .lean();

module.exports = {
  findMenteeProfilesByUserIds,
  findMenteeProfileByUserId,
  deleteMenteeProfileByUserId,
  findMenteeProfile,
};
