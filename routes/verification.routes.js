const express = require("express");
const router = express.Router();
const {
  sendVerification,
  resendVerification,
  verifyOtp,
  verifyLink,
} = require("../controllers/verification.controller");

router.post("/send", sendVerification);       // POST /api/verification/send
router.post("/resend", resendVerification);   // POST /api/verification/resend
router.post("/verify-otp", verifyOtp);        // POST /api/verification/verify-otp
router.get("/verify/:token", verifyLink);     // GET  /api/verification/verify/:token?email=...

module.exports = router;