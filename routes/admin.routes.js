/**
 * @fileoverview Corporate Platform Command and Control Management Operations Routes Blueprint
 * @prefix       /api/v1/admin
 * @access       Public / Private (Exclusive Administrator Firewall Access)
 */
const express = require("express");
const router = express.Router();

const { adminAuthenticate } = require("../middleware/adminAuth");
const {
  adminLogin,
  adminMe,
  getStats,
  getUsers,
  getUserDetail,
  adminLogout,
  deleteUser,
  blockUser,
  unblockUser,
  getEngagementStats,
  getEngagements,
  getUserGrowth,
  getMentorIndustryStats,
} = require("../controllers/admin.controller");

const { getPendingCount } = require("../controllers/leapRequest.controller");

// --- PUBLIC INITIALIZATION ACCESS PORTS ---
// @route   POST /api/v1/admin/auth/login
router.post("/auth/login", adminLogin);

// @route   POST /api/v1/admin/auth/logout
router.post("/auth/logout", adminLogout);

// --- SECURED PLATFORM DASHBOARD FIREWALLS (EXCLUSIVE ADMINISTRATOR REALMS) ---
router.use(adminAuthenticate);

// @route   GET /api/v1/admin/auth/me
router.get("/auth/me", adminMe);

// --- GLOBAL METRICS & HISTORICAL DATA TIMELINES ---
// @route   GET /api/v1/admin/stats
router.get("/stats", getStats);

// @route   GET /api/v1/admin/user-growth
router.get("/user-growth", getUserGrowth);

// @route   GET /api/v1/admin/stats/mentor-industries
router.get("/stats/mentor-industries", getMentorIndustryStats);

// @route   GET /api/v1/admin/engagements/stats
router.get("/engagements/stats", getEngagementStats);

// --- USER PROFILE COMPLIANCE AND SECURITY MODIFICATIONS ---
// @route   GET /api/v1/admin/users
router.get("/users", getUsers);

// @route   GET /api/v1/admin/users/:userId
router.get("/users/:userId", getUserDetail);

// @route   DELETE /api/v1/admin/users/:userId
router.delete("/users/:userId", deleteUser);

// @route   PATCH /api/v1/admin/users/:userId/block
router.patch("/users/:userId/block", blockUser);

// @route   PATCH /api/v1/admin/users/:userId/unblock
router.patch("/users/:userId/unblock", unblockUser);

// --- TRANSACTION WORKSPACES AND CONTRACT MONITORS ---
// @route   GET /api/v1/admin/engagements
router.get("/engagements", getEngagements);

// --- WALLET REQUESTS & CREDIT ALLOCATION QUEUES ---
// @route   GET /api/v1/admin/leap-requests/pending-count
router.get("/leap-requests/pending-count", getPendingCount);

module.exports = router;
