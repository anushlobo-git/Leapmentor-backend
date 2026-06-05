const { socialAuthUser } = require("../services/socialAuth.service");
const { setAuthCookies } = require("../utils/auth.cookies");
const logger = require("../config/logger");

const socialAuth = async (req, res) => {
  try {
    const result = await socialAuthUser(req.body);

    //Set token + role as cookies
    const role = result.user?.roles?.[0] || null;
    setAuthCookies(res, result.refreshToken, role);

    return res.json({
      message: "Social login successful",
      user: result.user,
      accessToken: result.accessToken,
      isNewUser: result.isNewUser,
    });
  } catch (err) {
    logger.warn("Social auth failed", { error: err.message });
    if (err.message === "TERMS_NOT_ACCEPTED")
      return res
        .status(400)
        .json({ message: "You must accept terms to continue" });
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { socialAuth };
