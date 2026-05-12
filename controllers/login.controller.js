// controllers/login.controller.js
const { loginUser } = require("../services/auth.service");

const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (err.message === "EMAIL_NOT_VERIFIED") {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        isEmailVerified: false,
      });
    }
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { login };
