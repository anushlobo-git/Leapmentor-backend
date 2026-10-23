/**
 * @fileoverview User Profile Lifecycle Routing Matrix
 * @description Routes for a logged-in user's own account — profile lookup and
 * self-service role management (RBAC).
 */

const express = require("express");

const createUserRoutes = ({ userController, authenticate, validations }) => {
  const router = express.Router();
  const { addRoleValidation } = validations;

  router.use(authenticate);

  // @route   GET /api/v1/users/me
  // @access  Private
  router.get("/me", userController.getMe);

  // @route   PATCH /api/v1/users/me/roles
  // @access  Private
  // Adds a role to the caller's own account (e.g. a mentee who also wants
  // to mentor). No `requireRole` here by design — a user by definition
  // does not yet have the role they're requesting.
  router.patch("/me/roles", addRoleValidation, userController.addRole);

  return router;
};

module.exports = createUserRoutes;
