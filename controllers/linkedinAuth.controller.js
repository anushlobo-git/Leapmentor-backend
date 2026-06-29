/**
 * @fileoverview LinkedIn OAuth Controller
 * @description Inverted network interface wrapper parsing federated parameters,
 * issuing redirects, and setting verification security records via parameter injection.
 */

const catchAsync = require("../utils/catchAsync");

// Upper-case Redirect Mapping Configuration Constants
const LINKEDIN_AUTH_GATEWAY = "https://www.linkedin.com/oauth/v2/authorization";
const OAUTH_SCOPE_CLAIMS = "openid profile email";
const OAUTH_RESPONSE_TYPE = "code";

const createLinkedinAuthController = ({
  linkedinAuthService,
  authUtils,
  cookieUtils,
  config,
  logger,
}) => {
  const { linkedinClientId, linkedinCallbackUrl, clientUrl } = config;

  /**
   * Initiates the outward browser flow bouncing users out toward the LinkedIn sign-in page.
   * @route   GET /api/v1/auth/linkedin
   * @access  Public
   */
  const linkedinRedirect = (req, res) => {
    const { role, termsAccepted } = req.query;
    const state = authUtils.signState({ role, termsAccepted });

    const params = new URLSearchParams({
      response_type: OAUTH_RESPONSE_TYPE,
      client_id: linkedinClientId,
      redirect_uri: linkedinCallbackUrl,
      scope: OAUTH_SCOPE_CLAIMS,
      state,
    });

    logger.info("LinkedIn OAuth transaction route redirect triggered", {
      role,
    });
    return res.redirect(`${LINKEDIN_AUTH_GATEWAY}?${params}`);
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
      return res.redirect(`${clientUrl}/?linkedin=failure`);
    }

    try {
      authUtils.verifyState(state);
    } catch (stateVerificationError) {
      logger.warn(
        "LinkedIn validation token state structure verification crashed",
        { message: stateVerificationError.message },
      );
      return res.redirect(
        `${clientUrl}/?linkedin=failure&reason=invalid_state`,
      );
    }

    return res.redirect(
      `${clientUrl}/sso-callback?code=${code}&state=${state}&provider=linkedin`,
    );
  };

  /**
   * Accepts code validations from frontend assets, returning logged in authentication sessions.
   * @route   POST /api/v1/auth/linkedin/token
   * @access  Public
   */
  const linkedinAuth = catchAsync(async (req, res, next) => {
    const result = await linkedinAuthService.exchangeLinkedinCode({
      code: req.body.code,
      roles: req.body.roles,
      termsAccepted: req.body.termsAccepted,
    });

    const primaryRole = result.user?.roles?.[0] || null;
    cookieUtils.setAuthCookies(res, result.refreshToken, primaryRole);

    return res.status(200).json({
      message: "LinkedIn login successful",
      user: result.user,
      accessToken: result.accessToken,
      isNewUser: result.isNewUser,
    });
  });

  return {
    linkedinRedirect,
    linkedinCallback,
    linkedinAuth,
  };
};

module.exports = createLinkedinAuthController;
