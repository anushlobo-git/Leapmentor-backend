// controllers/register.controller.js
const { registerUser } = require("../services/auth.service");
const { setAuthCookies } = require("../utils/auth.cookies");

const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);

    const role = result.user?.roles?.[0] || null;
    setAuthCookies(res, result.token, role);

    return res.status(201).json({
      message: "Registered successfully",
      user:result.user,
      isNewUser:result.isNewUser,
    });

  } catch (err) {
    // handle specific known errors
    if (err.message === "ALREADY_REGISTERED") {
      return res.status(400).json({
        message: "This email is already registered. Please login instead.",
      });
    }
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { register };
