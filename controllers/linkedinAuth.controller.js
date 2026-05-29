const { linkedinAuthUser } = require("../services/linkedinAuth.service");
const { signState, verifyState } = require("../utils/auth.utils");

// Step 1 — Browser hits this to start OAuth
// Signs state with HMAC so it can't be tampered with
const linkedinRedirect = (req, res) => {
  const { role, termsAccepted } = req.query;

  const state = signState({ role, termsAccepted });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
    scope: "openid profile email",
    state,
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
};

// Step 2 — LinkedIn redirects back here with code
// Verifies state wasn't tampered with, then forwards to frontend
const linkedinCallback = (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/?linkedin=failure`);
  }

  try {
    verifyState(state); // throws if signature is invalid
  } catch {
    return res.redirect(
      `${process.env.CLIENT_URL}/?linkedin=failure&reason=invalid_state`,
    );
  }

  res.redirect(
    `${process.env.CLIENT_URL}/sso-callback?code=${code}&state=${state}&provider=linkedin`,
  );
};

// Step 3 — Frontend posts code here to get JWT token
// Mirrors googleAuth controller exactly
const linkedinAuth = async (req, res) => {
  try {
    const result = await linkedinAuthUser(req.body);
    return res.json({ message: "LinkedIn login successful", ...result });
  } catch (err) {
    if (err.message === "TERMS_NOT_ACCEPTED")
      return res
        .status(400)
        .json({ message: "You must accept terms to continue" });
    return res
      .status(401)
      .json({ message: "LinkedIn authentication failed", error: err.message });
  }
};

module.exports = { linkedinRedirect, linkedinCallback, linkedinAuth };
