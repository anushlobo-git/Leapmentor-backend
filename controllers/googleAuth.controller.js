const { googleAuthUser } = require("../services/googleAuth.service");

const googleAuth = async (req, res) => {
  try {
    const result = await googleAuthUser(req.body);
    return res.json({ message: "Google login successful", ...result });
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
