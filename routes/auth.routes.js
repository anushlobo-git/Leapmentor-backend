const express = require("express");
const router = express.Router();

const { register } = require("../controllers/register.controller");
const { login } = require("../controllers/login.controller");
const { googleAuth } = require("../controllers/googleAuth.controller");
const { socialAuth } = require("../controllers/socialAuth.controller");
const { clerkSSO } = require("../controllers/clerkSSO.controller");
const { changePassword } = require("../controllers/changePassword.controller"); 
const { authenticate } = require("../middleware/authenticate"); 

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/google
router.post("/google", googleAuth);

// POST /api/auth/social
router.post("/social", socialAuth);

// POST /api/auth/clerk-sso
router.post("/clerk-sso", clerkSSO);

// PUT /api/auth/change-password                                                
router.put("/change-password", authenticate, changePassword); 

module.exports = router;