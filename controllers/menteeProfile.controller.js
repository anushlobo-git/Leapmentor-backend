// controllers/menteeProfile.controller.js
const MenteeProfile = require("../models/MenteeProfile");

/**
 * POST /api/mentee-profile
 * Create mentee profile (onboarding form submission)
 */
const createProfile = async (req, res) => {
  try {
    const existing = await MenteeProfile.findOne({ user: req.user._id });
    if (existing) {
      return res.status(409).json({ message: "Profile already exists. Use update instead." });
    }

    const {
      currentRole,
      industry,
      company,
      yearsOfExperience,
      bio,
      profilePicture,
      linkedInUrl,
      portfolioUrl,
      skills,
      interestedFields,
      communicationPreferences,
      languages,
    } = req.body;

    const profile = await MenteeProfile.create({
      user: req.user._id,
      currentRole,
      industry,
      company,
      yearsOfExperience: yearsOfExperience || 0,
      bio,
      profilePicture: profilePicture || "",
      linkedInUrl: linkedInUrl || "",
      portfolioUrl: portfolioUrl || "",
      skills: skills || [],
      interestedFields: interestedFields || [],
      communicationPreferences: communicationPreferences || [],
      languages: languages || ["English"],
      isProfileComplete: true,
      isProfilePublished: true,
    });

    return res.status(201).json({
      message: "Mentee profile created successfully",
      profile,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/mentee-profile/me
 * Get logged-in mentee's own profile
 */
const getMyProfile = async (req, res) => {
  try {
    const profile = await MenteeProfile.findOne({ user: req.user._id })
      .populate("user", "name email isEmailVerified");

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
        isProfileComplete: false,
      });
    }

    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/mentee-profile/me
 * Update logged-in mentee's own profile
 */
const updateProfile = async (req, res) => {
  try {
    const profile = await MenteeProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/mentee-profile/:id
 * Get any mentee's public profile by userId
 */
const getPublicProfile = async (req, res) => {
  try {
    const profile = await MenteeProfile.findOne({
      user: req.params.id,
      isProfilePublished: true, // ✅ updated field name
    }).populate("user", "name email");

    if (!profile) {
      return res.status(404).json({ message: "Mentee profile not found" });
    }

    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createProfile,
  getMyProfile,
  updateProfile,
  getPublicProfile,
};