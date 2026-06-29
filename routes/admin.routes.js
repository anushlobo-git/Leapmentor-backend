/**
 * @fileoverview Corporate Platform Command and Control Management Operations Routes Blueprint
 * @description Coordinates routing paths to corresponding controllers, enforcing validation gates.
 * Completely decoupled from concrete controller and middleware configurations via constructor injection.
 */

const express = require("express");

const {
  adminLoginValidation,
  getUsersQueryValidation,
  getEngagementsQueryValidation,
  userIdParamValidation,
} = require("../validations/admin.validation");

const createAdminRoutes = ({
  adminController,
  leapRequestController,
  adminAuthenticate,
}) => {
  const router = express.Router();

  // --- PUBLIC INITIALIZATION ACCESS PORTS ---
  // @route   POST /api/v1/admin/auth/login
  router.post("/auth/login", adminLoginValidation, adminController.adminLogin);

  // @route   POST /api/v1/admin/auth/logout
  router.post("/auth/logout", adminController.adminLogout);

  // --- SECURED PLATFORM DASHBOARD FIREWALLS (EXCLUSIVE ADMINISTRATOR REALMS) ---
  router.use(adminAuthenticate);

  // @route   GET /api/v1/admin/auth/me
  router.get("/auth/me", adminController.adminMe);

  // --- GLOBAL METRICS & HISTORICAL DATA TIMELINES ---
  // @route   GET /api/v1/admin/stats
  router.get("/stats", adminController.getStats);

  // @route   GET /api/v1/admin/user-growth
  router.get("/user-growth", adminController.getUserGrowth);

  // @route   GET /api/v1/admin/stats/mentor-industries
  router.get(
    "/stats/mentor-industries",
    adminController.getMentorIndustryStats,
  );

  // @route   GET /api/v1/admin/engagements/stats
  router.get("/engagements/stats", adminController.getEngagementStats);

  // --- USER PROFILE COMPLIANCE AND SECURITY MODIFICATIONS ---
  // @route   GET /api/v1/admin/users
  router.get("/users", getUsersQueryValidation, adminController.getUsers);

  // @route   GET /api/v1/admin/users/:userId
  router.get(
    "/users/:userId",
    userIdParamValidation,
    adminController.getUserDetail,
  );

  // @route   DELETE /api/v1/admin/users/:userId
  router.delete(
    "/users/:userId",
    userIdParamValidation,
    adminController.deleteUser,
  );

  // @route   PATCH /api/v1/admin/users/:userId/block
  router.patch("/users/:userId/block", adminController.blockUser);

  // @route   PATCH /api/v1/admin/users/:userId/unblock
  router.patch("/users/:userId/unblock", adminController.unblockUser);

  // --- TRANSACTION WORKSPACES AND CONTRACT MONITORS ---
  // @route   GET /api/v1/admin/engagements
  router.get(
    "/engagements",
    getEngagementsQueryValidation,
    adminController.getEngagements,
  );

  // --- WALLET REQUESTS & CREDIT ALLOCATION QUEUES ---
  // @route   GET /api/v1/admin/leap-requests/pending-count
  router.get(
    "/leap-requests/pending-count",
    leapRequestController.getPendingCount,
  );

  return router;
};

module.exports = createAdminRoutes;
