const { socialAuthUser } = require("../services/socialAuth.service");
const { setAuthCookies } = require("../utils/auth.cookies");

const socialAuth = async (req, res) => {
  try {
    const result = await socialAuthUser(req.body);

    // ✅ Set token + role as cookies
    const role = result.user?.roles?.[0] || null;
    setAuthCookies(res, result.token, role);

    return res.json({ 
      message: "Social login successful",
      user:result.user,
    });
  } catch (err) {
    if (err.message === "TERMS_NOT_ACCEPTED")
      return res
        .status(400)
        .json({ message: "You must accept terms to continue" });
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { socialAuth };
