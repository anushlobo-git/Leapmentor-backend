// controllers/admin.controller.js
const { adminLoginService } = require("../services/admin.auth.service");
const {
  getStatsService,
  getUserGrowthService,
  getMentorIndustryStatsService,
} = require("../services/admin.stats.service");
const {
  getUsersService,
  getUserDetailService,
  deleteUserService,
  blockUserService,
  unblockUserService,
} = require("../services/admin.users.service");
const {
  getEngagementStatsService,
  getEngagementsService,
} = require("../services/admin.engagements.service");

// ── AUTH ──────────────────────────────────────────────────────
const adminLogin = async (req, res) => {
  try {
    const result = await adminLoginService(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS")
      return res.status(401).json({ message: "Invalid credentials." });
    if (err.message === "ACCOUNT_DEACTIVATED")
      return res.status(403).json({ message: "Admin account is deactivated." });
    return res.status(500).json({ message: "Server error." });
  }
};

const adminMe = async (req, res) => {
  return res.status(200).json({ admin: req.admin });
};

// ── STATS ─────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const result = await getStatsService();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

const getUserGrowth = async (req, res) => {
  try {
    const result = await getUserGrowthService();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch growth data" });
  }
};

const getMentorIndustryStats = async (req, res) => {
  try {
    const result = await getMentorIndustryStatsService();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ── USER MANAGEMENT ───────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const result = await getUsersService(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const result = await getUserDetailService(req.params.userId);
    return res.status(200).json(result);
  } catch (err) {
    if (err.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found." });
    return res.status(500).json({ message: "Server error." });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { name, email } = await deleteUserService(req.params.userId);
    return res
      .status(200)
      .json({
        success: true,
        message: `User ${name} (${email}) has been permanently deleted.`,
      });
  } catch (err) {
    if (err.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found." });
    return res.status(500).json({ message: "Server error." });
  }
};

const blockUser = async (req, res) => {
  try {
    const { name } = await blockUserService(req.params.userId);
    return res
      .status(200)
      .json({ success: true, message: `User ${name} has been blocked.` });
  } catch (err) {
    if (err.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found." });
    return res.status(500).json({ message: "Server error." });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { name } = await unblockUserService(req.params.userId);
    return res
      .status(200)
      .json({ success: true, message: `User ${name} has been restored.` });
  } catch (err) {
    if (err.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found." });
    return res.status(500).json({ message: "Server error." });
  }
};

// ── ENGAGEMENTS ───────────────────────────────────────────────
const getEngagementStats = async (req, res) => {
  try {
    const result = await getEngagementStatsService();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

const getEngagements = async (req, res) => {
  try {
    const result = await getEngagementsService(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  adminLogin,
  adminMe,
  getStats,
  getUserGrowth,
  getMentorIndustryStats,
  getUsers,
  getUserDetail,
  deleteUser,
  blockUser,
  unblockUser,
  getEngagementStats,
  getEngagements,
};
