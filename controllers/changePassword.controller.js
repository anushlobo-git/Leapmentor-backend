const { changeUserPassword } = require("../services/auth.service");

const changePassword = async (req, res) => {
  try {
    await changeUserPassword(req.user._id, req.body);
    return res.json({ message: "Password changed successfully." });
  } catch (err) {
    if (err.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found." });
    if (err.message === "WRONG_PASSWORD")
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { changePassword };
