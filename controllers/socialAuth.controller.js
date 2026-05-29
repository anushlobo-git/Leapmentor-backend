const { socialAuthUser } = require("../services/socialAuth.service");

const socialAuth = async (req, res) => {
  try {
    const result = await socialAuthUser(req.body);
    return res.json({ message: "Social login successful", ...result });
  } catch (err) {
    if (err.message === "TERMS_NOT_ACCEPTED")
      return res
        .status(400)
        .json({ message: "You must accept terms to continue" });
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { socialAuth };
