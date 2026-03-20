const SupportMessage = require("../models/SupportMessage");
const Notification   = require("../models/Notification");
const User           = require("../models/User");
const { sendSupportResolvedEmail } = require("../utils/sendNotificationEmail");

exports.createMessage = async (req, res) => {
  try {
    const { email, subject, message, role } = req.body;
    if (!email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const msg = await SupportMessage.create({
      email, subject, message, role: role || "user", status: "open",
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const msgs = await SupportMessage.find().sort({ createdAt: -1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.resolveMessage = async (req, res) => {
  try {
    const msg = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { status: "resolved" },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: "Not found" });

    // ── Find user by email to send notification ──────────────
    const user = await User.findOne({ email: msg.email });

    // ── 1. Dashboard notification (if user account found) ────
    if (user) {
      await Notification.create({
        recipient: user._id,
        type: "support_resolved",
        title:     "Support ticket resolved ✅",
        message:   `Your support request "${msg.subject}" has been resolved by our team.`,
        read:      false,
        metadata:  {},
      });
    }

    // ── 2. Email notification ─────────────────────────────────
    try {
      await sendSupportResolvedEmail({
        toEmail:  msg.email,
        subject:  msg.subject,
      });
    } catch (emailErr) {
      console.error("⚠️ Support resolved email failed:", emailErr.message);
      // don't block the response if email fails
    }

    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};