/**
 * @fileoverview User Profile Lifecycle Routing Matrix
 * @description Directs application pathways mapping your identity lookups via parameter factory injection.
 */

const express = require("express");

const createUserRoutes = ({ authenticate }) => {
  const router = express.Router();

  // GET /api/v1/users/me — returns logged-in user's own data
  router.get("/me", authenticate, async (req, res) => {
    return res.json(req.user);
  });

  return router;
};

module.exports = createUserRoutes;
