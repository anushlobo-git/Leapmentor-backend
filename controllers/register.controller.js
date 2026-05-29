// controllers/register.controller.js
const { registerUser } = require("../services/auth.service");

const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    return res.status(201).json({
      message: "Registered successfully",
      ...result,
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
