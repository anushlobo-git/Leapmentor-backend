const express = require("express");
const router = express.Router();

const { register } = require("../controllers/register.controller");
const { login } = require("../controllers/login.controller");
const { googleAuth } = require("../controllers/googleAuth.controller");
const { socialAuth } = require("../controllers/socialAuth.controller");
const { changePassword } = require("../controllers/changePassword.controller");
const { authenticate } = require("../middleware/authenticate");
const { clearAuthCookies } = require("../utils/auth.cookies");
const {
  linkedinRedirect,
  linkedinCallback,
  linkedinAuth,
} = require("../controllers/linkedinAuth.controller");

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/social", socialAuth);
router.put("/change-password", authenticate, changePassword);

// ✅ ADD logout route — clears both cookies server-side
router.post("/logout", (req, res) => {
  clearAuthCookies(res);
  return res.status(200).json({ message: "Logged out successfully" });
});

// LinkedIn OAuth — 3 routes replace /clerk-sso entirely
router.get("/linkedin", linkedinRedirect);
router.get("/linkedin/callback", linkedinCallback);
router.post("/linkedin/token", linkedinAuth);

// DELETED: router.post("/clerk-sso", clerkSSO);

module.exports = router;
