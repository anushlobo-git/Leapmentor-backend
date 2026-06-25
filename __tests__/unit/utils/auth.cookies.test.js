/**
 * @fileoverview Cookie Utilities Component Unit Tests
 * @description Validates cookie attribute assignments, role logic flags,
 * and clear triggers across varying environmental flag overrides.
 */

const createCookieUtils = require("../../../utils/auth.cookies");

describe("Cookie Utilities Unit Tests Matrix", () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Production Environment Overrides (isProd: true)", () => {
    let cookieUtils;

    beforeEach(() => {
      cookieUtils = createCookieUtils({ isProd: true });
    });

    test("should append secure attributes and cross-site safe-flags when generating cookies with roles", () => {
      cookieUtils.setAuthCookies(mockRes, "mock_prod_token", "mentor");

      expect(mockRes.cookie).toHaveBeenCalledTimes(2);

      // Assert secure HTTP-only refresh token configuration properties
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "mock_prod_token",
        {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );

      // Assert non-HTTP-only client-accessible role cookie configuration properties
      expect(mockRes.cookie).toHaveBeenCalledWith("authRole", "mentor", {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    });

    test("should strip authentication cookies matching exact production cross-site attributes", () => {
      cookieUtils.clearAuthCookies(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        expect.objectContaining({
          secure: true,
          sameSite: "none",
        }),
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        "authRole",
        expect.objectContaining({
          httpOnly: false,
          secure: true,
          sameSite: "none",
        }),
      );
    });
  });

  describe("Development Environment Overrides (isProd: false)", () => {
    let cookieUtils;

    beforeEach(() => {
      cookieUtils = createCookieUtils({ isProd: false });
    });

    test("should apply loose local lax rules and skip secure bindings when no role parameter is sent", () => {
      cookieUtils.setAuthCookies(mockRes, "mock_dev_token", null);

      expect(mockRes.cookie).toHaveBeenCalledTimes(1);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "mock_dev_token",
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );
    });
  });
});
