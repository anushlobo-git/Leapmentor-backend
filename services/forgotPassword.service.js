// backend/services/forgotPassword.service.js
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const AppError = require("../utils/AppError");

const userRepo = require("../repositories/user.repository");
const verificationTokenRepo = require("../repositories/verificationToken.repository");

const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// ─────────────────────────────────────────────────────────────
// sendForgotPasswordOTP
// ─────────────────────────────────────────────────────────────
const sendForgotPasswordOTP = async ({ email }) => {
  if (!email) throw new AppError("email is required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userRepo.findByEmail(normalizedEmail);

  // Don't reveal whether the email exists — security best practice
  if (!user) return { message: "If this email exists, an OTP has been sent." };

  await verificationTokenRepo.deleteAllForUser(user._id);

  const otpPlain = makeOtp();
  const otpHash = await bcrypt.hash(otpPlain, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  await verificationTokenRepo.create({ userId: user._id, otpHash, expiresAt });
  await _sendOtpEmail(user.email, otpPlain);

  return { message: "If this email exists, an OTP has been sent." };
};

// ─────────────────────────────────────────────────────────────
// verifyResetOTP
// ─────────────────────────────────────────────────────────────
const verifyResetOTP = async ({ email, otp }) => {
  if (!email || !otp) throw new AppError("email and otp are required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userRepo.findByEmail(normalizedEmail);
  if (!user) throw new AppError("Invalid OTP", 400);

  const record = await verificationTokenRepo.findByUser(user._id);
  if (!record?.otp)
    throw new AppError(
      "No reset request found. Please request a new OTP.",
      400,
    );

  if (record.expiresAt < new Date()) {
    await verificationTokenRepo.deleteAllForUser(user._id);
    throw new AppError("OTP expired. Please request a new one.", 400);
  }

  const ok = await bcrypt.compare(String(otp).trim(), record.otp);
  if (!ok) throw new AppError("Invalid OTP", 400);

  // Extend window for the password-reset step
  await verificationTokenRepo.extendExpiry(
    record._id,
    new Date(Date.now() + 5 * 60 * 1000),
  );

  return { message: "OTP verified", email: normalizedEmail };
};

// ─────────────────────────────────────────────────────────────
// resetPassword
// ─────────────────────────────────────────────────────────────
const resetPassword = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword)
    throw new AppError("email, otp and newPassword are required", 400);
  if (newPassword.length < 6)
    throw new AppError("Password must be at least 6 characters", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userRepo.findByEmail(normalizedEmail);
  if (!user) throw new AppError("Invalid request", 400);

  const record = await verificationTokenRepo.findByUser(user._id);
  if (!record?.otp)
    throw new AppError("Session expired. Please start over.", 400);

  if (record.expiresAt < new Date()) {
    await verificationTokenRepo.deleteAllForUser(user._id);
    throw new AppError("Session expired. Please start over.", 400);
  }

  // Re-verify OTP on final step — prevents skipping step 2
  const ok = await bcrypt.compare(String(otp).trim(), record.otp);
  if (!ok) throw new AppError("Invalid session. Please start over.", 400);

  await userRepo.updatePassword(user._id, await bcrypt.hash(newPassword, 10));
  await verificationTokenRepo.deleteAllForUser(user._id);

  return { message: "Password reset successfully. You can now login." };
};

// ─────────────────────────────────────────────────────────────
// Private — OTP email
// Move to a shared mailer util when you centralise email sending.
// ─────────────────────────────────────────────────────────────
const _transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const _sendOtpEmail = (toEmail, otpPlain) =>
  _transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: toEmail,
    subject: "LeapMentor — Reset your password",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
          <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0;">Reset Your Password</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">LeapMentor account recovery</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="font-size:14px;color:#475569;margin:0 0 20px;">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
            <p style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1e293b;margin:0;">${otpPlain}</p>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:0;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });

module.exports = { sendForgotPasswordOTP, verifyResetOTP, resetPassword };
