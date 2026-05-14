const MentorProfile = require("../models/MentorProfile");

const getMentorIndustryStats = () =>
  MentorProfile.aggregate([
    { $match: { industry: { $exists: true, $ne: null, $ne: "" } } },
    { $group: { _id: "$industry", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ]);

const findMentorProfilesByUserIds = (userIds) =>
  MentorProfile.find({ user: { $in: userIds } })
    .select("user isProfileComplete isProfilePublished")
    .lean();

const findMentorProfileByUserId = (userId) =>
  MentorProfile.findOne({ user: userId }).lean();

const deleteMentorProfileByUserId = (userId) =>
  MentorProfile.findOneAndDelete({ user: userId });

const findAllMentorProfiles = () =>
  MentorProfile.find({})
    .populate("user", "name email createdAt")
    .select(
      "user verificationStatus phoneNumber resumeDocument workExperienceDocuments " +
        "profilePicture bio skills currentRole company industry yearsOfExperience " +
        "languages averageRating totalSessions points",
    )
    .sort({ createdAt: -1 })
    .lean();

const findMentorProfileById = (id) =>
  MentorProfile.findById(id).populate("user", "name email createdAt").lean();

const findMentorProfileByIdWithUser = (id) =>
  MentorProfile.findById(id).populate("user", "name email");

const saveMentorProfile = (profile) => profile.save();


module.exports = { 
    getMentorIndustryStats,
    findMentorProfilesByUserIds,
    findMentorProfileByUserId,
    deleteMentorProfileByUserId,
    findAllMentorProfiles,
    findMentorProfileById,
    findMentorProfileByIdWithUser,
    saveMentorProfile,
 };
