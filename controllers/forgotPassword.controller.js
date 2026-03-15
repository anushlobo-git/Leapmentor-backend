// backend/controllers/forgotPassword.controller.js
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const VerificationToken = require("../models/VerificationToken");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Sends a 6-digit OTP to the user's email
 */
const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // ✅ Don't reveal if email exists or not — security best practice
    if (!user) {
      return res.json({ message: "If this email exists, an OTP has been sent." });
    }

    // ✅ Reuse VerificationToken model — delete old, create new
    await VerificationToken.deleteMany({ user: user._id });

    const otpPlain = makeOtp();
    const otpHash  = await bcrypt.hash(otpPlain, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await VerificationToken.create({
      user: user._id,
      otp: otpHash,
      expiresAt,
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: user.email,
      subject: "LeapMentor — Reset your password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 32px;">
            <h1 style="color: #fff; font-size: 20px; font-weight: 700; margin: 0;">Reset Your Password</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 6px 0 0;">LeapMentor account recovery</p>
          </div>
          <div style="padding: 28px 32px;">
            <p style="font-size: 14px; color: #475569; margin: 0 0 20px;">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
              <p style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1e293b; margin: 0;">${otpPlain}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });

    return res.json({ message: "If this email exists, an OTP has been sent." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/auth/verify-reset-otp
 * Body: { email, otp }
 * Verifies OTP — returns a short-lived resetToken if valid
 */
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid OTP" });

    const record = await VerificationToken.findOne({ user: user._id });
    if (!record || !record.otp) {
      return res.status(400).json({ message: "No reset request found. Please request a new OTP." });
    }

    if (record.expiresAt < new Date()) {
      await VerificationToken.deleteMany({ user: user._id });
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    const ok = await bcrypt.compare(String(otp).trim(), record.otp);
    if (!ok) return res.status(400).json({ message: "Invalid OTP" });

    // ✅ OTP valid — mark as verified by extending expiry (don't delete yet)
    // We'll delete it after password reset
    record.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 more mins to set password
    await record.save();

    return res.json({ message: "OTP verified", email: normalizedEmail });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { email, otp, newPassword }
 * Resets password after OTP verification
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "email, otp and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid request" });

    const record = await VerificationToken.findOne({ user: user._id });
    if (!record || !record.otp) {
      return res.status(400).json({ message: "Session expired. Please start over." });
    }

    if (record.expiresAt < new Date()) {
      await VerificationToken.deleteMany({ user: user._id });
      return res.status(400).json({ message: "Session expired. Please start over." });
    }

    // ✅ Re-verify OTP on final step — prevents skipping step 2
    const ok = await bcrypt.compare(String(otp).trim(), record.otp);
    if (!ok) return res.status(400).json({ message: "Invalid session. Please start over." });

    // ✅ Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // ✅ Clean up token
    await VerificationToken.deleteMany({ user: user._id });

    return res.json({ message: "Password reset successfully. You can now login." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { sendForgotPasswordOTP, verifyResetOTP, resetPassword };