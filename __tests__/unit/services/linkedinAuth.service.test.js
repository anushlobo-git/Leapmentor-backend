/**
 * @fileoverview LinkedIn Authentication Service Unit Tests
 * @description Validates out-of-band Axios exchange graphs, token extractions,
 * and fallback OpenID exception conditions with zero real network dependencies.
 */

const createLinkedinAuthService = require("../../../services/linkedinAuth.service");
const AppError = require("../../../utils/AppError");

describe("LinkedIn Authentication Service Unit Tests", () => {
  let mockSocialAuthService, mockAxios, mockConfig, service;

  beforeEach(() => {
    mockSocialAuthService = {
      socialAuthUser: jest.fn(),
    };

    mockAxios = {
      post: jest.fn(),
      get: jest.fn(),
    };

    mockConfig = {
      linkedinCallbackUrl: "http://test.com/callback",
      linkedinClientId: "mock_client_id",
      linkedinClientSecret: "mock_client_secret",
    };

    service = createLinkedinAuthService(
      mockSocialAuthService,
      mockAxios,
      mockConfig,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should exchange valid codes and pass profile structures directly down to socialAuthUser", async () => {
    mockAxios.post.mockResolvedValue({
      data: { access_token: "mock_linkedin_access_token_123" },
    });
    mockAxios.get.mockResolvedValue({
      data: {
        sub: "linkedin_sub_uuid_888",
        email: "linkedinuser@test.com",
        name: "Dev Link",
      },
    });
    mockSocialAuthService.socialAuthUser.mockResolvedValue({
      success: true,
      isNewUser: false,
    });

    const result = await service.exchangeLinkedinCode({
      code: "valid_temp_auth_code",
      roles: ["mentor"],
      termsAccepted: true,
    });

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://www.linkedin.com/oauth/v2/accessToken",
      expect.any(URLSearchParams),
      expect.any(Object),
    );
    expect(mockAxios.get).toHaveBeenCalledWith(
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: "Bearer mock_linkedin_access_token_123" } },
    );
    expect(mockSocialAuthService.socialAuthUser).toHaveBeenCalledWith({
      provider: "linkedin",
      providerId: "linkedin_sub_uuid_888",
      email: "linkedinuser@test.com",
      name: "Dev Link",
      roles: ["mentor"],
      termsAccepted: true,
    });
    expect(result).toEqual({ success: true, isNewUser: false });
  });

  test("should throw a 400 Bad Request error if the incoming authorization code argument is missing", async () => {
    await expect(service.exchangeLinkedinCode({ code: null })).rejects.toThrow(
      new AppError("Missing LinkedIn authorization code", 400),
    );
  });

  test("should throw a 401 Unauthorized error if the token exchange network request fails", async () => {
    const errorResponse = {
      response: {
        data: { error_description: "Authorization code is expired" },
      },
    };
    mockAxios.post.mockRejectedValue(errorResponse);

    await expect(
      service.exchangeLinkedinCode({ code: "expired_code" }),
    ).rejects.toThrow(
      new AppError(
        "LinkedIn OAuth code exchange failure: Authorization code is expired",
        401,
      ),
    );
  });

  test("should throw a 401 Unauthorized error if the access_token field is missing from the response data", async () => {
    mockAxios.post.mockResolvedValue({ data: {} });

    await expect(
      service.exchangeLinkedinCode({ code: "code" }),
    ).rejects.toThrow(
      new AppError(
        "Failed to obtain a valid LinkedIn access token properties reference",
        401,
      ),
    );
  });

  test("should throw a 401 Unauthorized error if the userinfo profile lookup fails", async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: "tok" } });
    mockAxios.get.mockRejectedValue(new Error("Network Timeout"));

    await expect(
      service.exchangeLinkedinCode({ code: "code" }),
    ).rejects.toThrow(
      new AppError(
        "Failed to fetch profile info from LinkedIn OpenID endpoints: Network Timeout",
        401,
      ),
    );
  });

  test("should throw a 400 Bad Request error if OpenID profile mappings return missing vital keys", async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: "tok" } });
    mockAxios.get.mockResolvedValue({ data: { name: "Broken User" } }); // missing sub and email keys

    await expect(
      service.exchangeLinkedinCode({ code: "code" }),
    ).rejects.toThrow(
      new AppError(
        "LinkedIn authentication failed: structural OpenID profile attributes missing",
        400,
      ),
    );
  });
});
