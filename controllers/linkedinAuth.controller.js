/**
 * @fileoverview LinkedIn OAuth Controller
 * @description Thin network interface wrapper parsing federated parameters, issuing redirects, and setting verification security records.
 */
const catchAsync = require("../utils/catchAsync");
const logger = require("../config/logger");
const { exchangeLinkedinCode } = require("../services/linkedinAuth.service");
const { signState, verifyState } = require("../utils/auth.utils");
const { setAuthCookies } = require("../utils/auth.cookies");

// Upper-case Redirect Mapping Configuration Constants
const LINKEDIN_AUTH_GATEWAY = "https://www.linkedin.com/oauth/v2/authorization";
const OAUTH_SCOPE_CLAIMS = "openid profile email";
const OAUTH_RESPONSE_TYPE = "code";

/**
 * Initiates the outward browser flow bouncing users out toward the LinkedIn sign-in page.
 * @route   GET /api/v1/auth/linkedin
 * @access  Public
 */
const linkedinRedirect = (req, res) => {
  const { role, termsAccepted } = req.query;
  const state = signState({ role, termsAccepted });

  const params = new URLSearchParams({
    response_type: OAUTH_RESPONSE_TYPE,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
    scope: OAUTH_SCOPE_CLAIMS,
    state,
  });

  logger.info("LinkedIn OAuth transaction route redirect triggered", { role });
  res.redirect(`${LINKEDIN_AUTH_GATEWAY}?${params}`);
};

/**
 * Catches incoming out-of-band queries routed directly from external LinkedIn network validations.
 * @route   GET /api/v1/auth/linkedin/callback
 * @access  Public
 */
const linkedinCallback = (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    logger.warn(
      "LinkedIn client validation pipeline failed or denied by resource owner",
      { error },
    );
    return res.redirect(`${process.env.CLIENT_URL}/?linkedin=failure`);
  }

  try {
    verifyState(state);
  } catch (stateVerificationError) {
    logger.warn(
      "LinkedIn validation token state structure verification crashed",
      { message: stateVerificationError.message },
    );
    return res.redirect(
      `${process.env.CLIENT_URL}/?linkedin=failure&reason=invalid_state`,
    );
  }

  res.redirect(
    `${process.env.CLIENT_URL}/sso-callback?code=${code}&state=${state}&provider=linkedin`,
  );
};

/**
 * Accepts code validations from frontend assets, returning logged in authentication sessions.
 * @route   POST /api/v1/auth/linkedin/token
 * @access  Public
 */
const linkedinAuth = catchAsync(async (req, res) => {
  const result = await exchangeLinkedinCode({
    code: req.body.code,
    roles: req.body.roles,
    termsAccepted: req.body.termsAccepted,
  });

  const primaryRole = result.user?.roles?.[0] || null;
  setAuthCookies(res, result.refreshToken, primaryRole);

  res.status(200).json({
    message: "LinkedIn login successful",
    user: result.user,
    accessToken: result.accessToken,
    isNewUser: result.isNewUser,
  });
});

module.exports = {
  linkedinRedirect,
  linkedinCallback,
  linkedinAuth,
};
