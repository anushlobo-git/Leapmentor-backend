/**
 * @fileoverview LinkedIn OAuth Controller Unit Tests
 * @description Assures valid generation of outbound parameters, state token catch verification rules,
 * and fallback error redirection boundaries with zero network connections.
 */

const createLinkedinAuthController = require("../../../controllers/linkedinAuth.controller");
const AppError = require("../../../utils/AppError");

describe("LinkedIn OAuth Controller Unit Tests", () => {
  let mockLinkedinAuthService,
    mockAuthUtils,
    mockCookieUtils,
    mockConfig,
    mockLogger,
    controller,
    mockReq,
    mockRes,
    mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockLinkedinAuthService = { exchangeLinkedinCode: jest.fn() };
    mockAuthUtils = { signState: jest.fn(), verifyState: jest.fn() };
    mockCookieUtils = { setAuthCookies: jest.fn() };
    mockLogger = { info: jest.fn(), warn: jest.fn() };

    mockConfig = {
      linkedinClientId: "lnk_client_key",
      linkedinCallbackUrl: "http://api.com/callback",
      clientUrl: "http://frontend.com",
    };

    controller = createLinkedinAuthController(
      mockLinkedinAuthService,
      mockAuthUtils,
      mockCookieUtils,
      mockConfig,
      mockLogger,
    );

    mockReq = { query: {}, body: {} };
    mockRes = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("linkedinRedirect Endpoint Flow", () => {
    test("should compile secure parameters and bounce clients out toward LinkedIn Auth Gateways", () => {
      mockReq.query = { role: "mentor", termsAccepted: "true" };
      mockAuthUtils.signState.mockReturnValue("compiled_mock_hash_string");

      controller.linkedinRedirect(mockReq, mockRes);

      expect(mockAuthUtils.signState).toHaveBeenCalledWith({
        role: "mentor",
        termsAccepted: "true",
      });
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://www.linkedin.com/oauth/v2/authorization?response_type=code",
        ),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining("state=compiled_mock_hash_string"),
      );
    });
  });

  describe("linkedinCallback Validation Gateway Catch", () => {
    test("should parse code parameters and bounce to frontend SSO landing page if valid", () => {
      mockReq.query = { code: "oauth_code_xyz", state: "valid_state_hash" };
      mockAuthUtils.verifyState.mockReturnValue({ role: "mentee" });

      controller.linkedinCallback(mockReq, mockRes);

      expect(mockAuthUtils.verifyState).toHaveBeenCalledWith(
        "valid_state_hash",
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        "http://frontend.com/sso-callback?code=oauth_code_xyz&state=valid_state_hash&provider=linkedin",
      );
    });

    test("should route users to standard failure structures if third-party parameters return with an error flag", () => {
      mockReq.query = { error: "user_cancelled_login" };

      controller.linkedinCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        "http://frontend.com/?linkedin=failure",
      );
      expect(mockAuthUtils.verifyState).not.toHaveBeenCalled();
    });

    test("should forward to specialized state error endpoints if state verification throws an exception", () => {
      mockReq.query = { code: "code", state: "tampered_hash" };
      mockAuthUtils.verifyState.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      controller.linkedinCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        "http://frontend.com/?linkedin=failure&reason=invalid_state",
      );
    });
  });

  describe("linkedinAuth Token Finalization", () => {
    test("should return user payloads and write secure cookies given valid access tokens", async () => {
      mockReq.body = { code: "code", roles: ["mentor"], termsAccepted: true };
      const mockResult = {
        accessToken: "acc_jwt",
        refreshToken: "ref_jwt",
        user: { _id: "usr_lnk_11", roles: ["mentor"] },
        isNewUser: false,
      };
      mockLinkedinAuthService.exchangeLinkedinCode.mockResolvedValue(
        mockResult,
      );

      await controller.linkedinAuth(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockLinkedinAuthService.exchangeLinkedinCode).toHaveBeenCalledWith(
        { code: "code", roles: ["mentor"], termsAccepted: true },
      );
      expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(
        mockRes,
        "ref_jwt",
        "mentor",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "LinkedIn login successful",
        user: mockResult.user,
        accessToken: "acc_jwt",
        isNewUser: false,
      });
    });

    test("should cascade service runtime exception rejections straight down into next() middleware", async () => {
      const mockException = new AppError(
        "LinkedIn OAuth code exchange failure",
        401,
      );
      mockLinkedinAuthService.exchangeLinkedinCode.mockRejectedValue(
        mockException,
      );

      await controller.linkedinAuth(mockReq, mockRes, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledWith(mockException);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
