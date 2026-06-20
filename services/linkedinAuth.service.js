/**
 * @fileoverview LinkedIn Authentication Service
 * @description Coordinates out-of-band Axios calls exchanging authorization codes for verified OpenID connect profiles.
 */
const axios = require("axios");
const AppError = require("../utils/AppError");
const { socialAuthUser } = require("./socialAuth.service");

// Upper-case Network URL Constants
const LINKEDIN_TOKEN_ENDPOINT = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_ENDPOINT = "https://api.linkedin.com/v2/userinfo";
const PROVIDER_LINKEDIN = "linkedin";

/**
 * Exchanges unique transaction tokens for open identity claims parameters.
 * @description Executes authorization code grants via secure form encoding, requests profile attributes,
 * extracts OpenID matching contexts, and proxies parameters down into core social authentication handlers.
 * @param {Object} params Operational execution configurations map.
 * @param {string} params.code Alphanumeric temporary authorization validation code returned from LinkedIn redirects.
 * @param {Array<string>} [params.roles] Intended target roles allocated down across registrations workflows.
 * @param {boolean} [params.termsAccepted] Profile acceptance configuration agreement flag tracker.
 * @throws {AppError} 400 | 401
 * @returns {Promise<Object>} Signed system access tokens and matched user configuration records.
 */
const exchangeLinkedinCode = async ({ code, roles, termsAccepted }) => {
  if (!code) {
    throw new AppError("Missing LinkedIn authorization code", 400);
  }

  let tokenRes;
  try {
    tokenRes = await axios.post(
      LINKEDIN_TOKEN_ENDPOINT,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
  } catch (axiosError) {
    const errorDetails =
      axiosError.response?.data?.error_description || axiosError.message;
    throw new AppError(
      `LinkedIn OAuth code exchange failure: ${errorDetails}`,
      401,
    );
  }

  const accessToken = tokenRes.data.access_token;
  if (!accessToken) {
    throw new AppError(
      "Failed to obtain a valid LinkedIn access token properties reference",
      401,
    );
  }

  let profileRes;
  try {
    profileRes = await axios.get(LINKEDIN_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (profileError) {
    throw new AppError(
      `Failed to fetch profile info from LinkedIn OpenID endpoints: ${profileError.message}`,
      401,
    );
  }

  const profileData = profileRes.data;
  const providerId = profileData.sub;
  const email = profileData.email?.toLowerCase()?.trim();
  const name =
    profileData.name ||
    `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim() ||
    "User";

  if (!providerId || !email) {
    throw new AppError(
      "LinkedIn authentication failed: structural OpenID profile attributes missing",
      400,
    );
  }

  return socialAuthUser({
    provider: PROVIDER_LINKEDIN,
    providerId,
    email,
    name,
    roles,
    termsAccepted,
  });
};

module.exports = { exchangeLinkedinCode };
