const { googleAuthUser } = require("../services/googleAuth.service");
const { setAuthCookies } = require("../utils/auth.cookies");

const googleAuth = async (req, res) => {
  try {
    const result = await googleAuthUser(req.body);
    // ✅ Set token + role as cookies
    const role = result.user?.roles?.[0] || null;
    setAuthCookies(res, result.token, role);

    return res.json({ 
      message: "Google login successful", 
      user:result.user,
     });
  } catch (err) {
    if (err.message === "TERMS_NOT_ACCEPTED")
      return res
        .status(400)
        .json({ message: "You must accept terms to continue" });
    return res
      .status(401)
      .json({ message: "Google authentication failed", error: err.message });
  }
};

module.exports = { googleAuth };
