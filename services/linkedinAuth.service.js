const axios = require("axios");
const { socialAuthUser } = require("./socialAuth.service");

const linkedinAuthUser = async ({ code, roles, termsAccepted }) => {
  if (!code) throw new Error("Missing LinkedIn authorization code");

   let tokenRes;

  // Step 1 — Exchange code for access token
  try {
     tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
  } catch (err) {
    throw err;
  }

  const accessToken = tokenRes.data.access_token;
  if (!accessToken) throw new Error("Failed to get LinkedIn access token");

  // Step 2 — Fetch profile from OpenID Connect endpoint
  // This works because "Sign In with LinkedIn using OpenID Connect"
  // is enabled in your LinkedIn Developer Portal
  const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const p = profileRes.data;

  // OpenID Connect returns these fields
  const providerId = p.sub; // unique LinkedIn user ID
  const email = p.email?.toLowerCase()?.trim();
  const name =
    p.name || `${p.given_name || ""} ${p.family_name || ""}`.trim() || "User";

  if (!providerId || !email) {
    throw new Error("LinkedIn did not return required profile data");
  }

  // Step 3 — Hand off to existing socialAuthUser
  return socialAuthUser({
    provider: "linkedin",
    providerId,
    email,
    name,
    roles,
    termsAccepted,
  });
};

module.exports = { linkedinAuthUser };
