//should delete not used 
const { clerkSSOAuth } = require("../services/clerkSSO.service");

const clerkSSO = async (req, res) => {
  try {
    const result = await clerkSSOAuth(req.body);
    return res.json({ message: "SSO login successful", ...result });
  } catch (err) {
    if (err.message === "TERMS_NOT_ACCEPTED")
      return res
        .status(400)
        .json({ message: "You must accept terms to continue" });
    return res
      .status(401)
      .json({ message: "Clerk SSO authentication failed", error: err.message });
  }
};

module.exports = { clerkSSO };
