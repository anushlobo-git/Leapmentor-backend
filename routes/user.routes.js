// src/routes/user.routes.js
const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const router = express.Router();

// GET /api/users/me — returns logged-in user's own data
router.get("/me", authenticate, async (req, res) => {
  return res.json(req.user);
});

module.exports = router;