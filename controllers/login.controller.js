// controllers/login.controller.js
const { loginUser } = require("../services/auth.service");
const { setAuthCookies } = require("../utils/auth.cookies");

const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);

    const role = result.user?.roles?.[0] || null;
    setAuthCookies(res, result.token, role);
     

    return res.status(200).json({
      message: "Login successful",
      user: result.user,
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
