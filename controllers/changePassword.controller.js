// controllers/changePassword.controller.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 12);

    // Save new password + record when it was changed
    user.password = hashed;
    user.passwordChangedAt = new Date();
    await user.save();

    return res.json({ message: "Password changed successfully." });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { changePassword };