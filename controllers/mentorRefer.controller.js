// controllers/mentorRefer.controller.js
const MentorProfile = require("../models/MentorProfile");

/**
 * GET /api/connect-requests/:id/similar-mentors
 * Returns mentors with similar skills to the current mentor
 * Used to populate the Refer Modal dropdown
 */
const getSimilarMentors = async (req, res) => {
  try {
    const ConnectRequest = require("../models/ConnectRequest");

    // Get the original request
    const request = await ConnectRequest.findById(req.params.id)
      .populate("mentor", "_id");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Only the mentor who received it can fetch similar mentors
    if (request.mentor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get current mentor's skills
    const myProfile = await MentorProfile.findOne({ 
      user: req.user._id 
    }).select("skills industry");

    if (!myProfile || myProfile.skills.length === 0) {
      return res.json({ success: true, mentors: [] });
    }

    // Find other published mentors who share at least 1 skill
    const similarMentors = await MentorProfile.find({
      user: { $ne: req.user._id },          // exclude self
      isProfilePublished: true,
      isProfileComplete: true,
      skills: { $in: myProfile.skills },    // at least 1 matching skill
    })
      .populate("user", "name email")
      .select("user currentRole company skills profilePicture avgRating industry hourlyRate")
      .limit(20)
      .lean();

    //  Sort by number of matching skills (most relevant first)
    const mySkillsSet = new Set(myProfile.skills.map(s => s.toLowerCase()));

    const scored = similarMentors.map((mentor) => {
      const matchCount = mentor.skills.filter(s => 
        mySkillsSet.has(s.toLowerCase())
      ).length;
      return { ...mentor, matchCount };
    });

    scored.sort((a, b) => b.matchCount - a.matchCount);

    return res.json({ 
      success: true, 
      mentors: scored,
      mySkills: myProfile.skills,  
    });

  } catch (err) {
    console.error("❌ Similar mentors error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getSimilarMentors };