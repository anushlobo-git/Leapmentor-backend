/**
 * @fileoverview LinkedIn Authentication Service Unit Tests
 */

const createLinkedinAuthService = require("../../../services/linkedinAuth.service");

describe("LinkedIn Authentication Service Unit Tests", () => {
  let mockSocialAuthService, mockAxios, mockConfig, service;

  beforeEach(() => {
    mockSocialAuthService = { socialAuthUser: jest.fn() };
    mockAxios = { post: jest.fn(), get: jest.fn() };
    mockConfig = {
      linkedinCallbackUrl: "http://test.com/callback",
      linkedinClientId: "mock_client_id",
      linkedinClientSecret: "mock_client_secret",
    };

    service = createLinkedinAuthService({
      socialAuthService: mockSocialAuthService,
      axios: mockAxios,
      config: mockConfig,
    });
  });

  afterEach(() => jest.clearAllMocks());

  test("should exchange valid code and pass profile to socialAuthUser", async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: "tok_123" } });
    mockAxios.get.mockResolvedValue({
      data: { sub: "sub_888", email: "User@Test.COM", name: "Dev Link" },
    });
    mockSocialAuthService.socialAuthUser.mockResolvedValue({
      success: true,
      isNewUser: false,
    });

    const result = await service.exchangeLinkedinCode({
      code: "valid_code",
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
      { headers: { Authorization: "Bearer tok_123" } },
    );
    expect(mockSocialAuthService.socialAuthUser).toHaveBeenCalledWith({
      provider: "linkedin",
      providerId: "sub_888",
      email: "user@test.com",
      name: "Dev Link",
      roles: ["mentor"],
      termsAccepted: true,
    });
    expect(result).toEqual({ success: true, isNewUser: false });
  });

  test("should build name from given_name + family_name when name is absent", async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: "tok" } });
    mockAxios.get.mockResolvedValue({
      data: {
        sub: "sub_1",
        email: "a@b.com",
        given_name: "John",
        family_name: "Doe",
      },
    });
    mockSocialAuthService.socialAuthUser.mockResolvedValue({});

    await service.exchangeLinkedinCode({ code: "code" });

    expect(mockSocialAuthService.socialAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "John Doe" }),
    );
  });

  test("should fall back to 'User' when all name fields are absent", async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: "tok" } });
    mockAxios.get.mockResolvedValue({
      data: { sub: "sub_2", email: "a@b.com" },
    });
    mockSocialAuthService.socialAuthUser.mockResolvedValue({});

    await service.exchangeLinkedinCode({ code: "code" });

    expect(mockSocialAuthService.socialAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "User" }),
    );
  });

  test("should throw 400 if authorization code is missing", async () => {
    await expect(
      service.exchangeLinkedinCode({ code: null }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Missing LinkedIn authorization code",
    });
  });

  test("should throw 401 if token exchange request fails", async () => {
    mockAxios.post.mockRejectedValue({
      response: {
        data: { error_description: "Authorization code is expired" },
      },
    });

    await expect(
      service.exchangeLinkedinCode({ code: "expired_code" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message:
        "LinkedIn OAuth code exchange failure: Authorization code is expired",
    });
  });

  test("should throw 401 using axiosError.message when response data is absent", async () => {
    mockAxios.post.mockRejectedValue({ message: "Network Error" });

    await expect(
      service.exchangeLinkedinCode({ code: "code" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "LinkedIn OAuth code exchange failure: Network Error",
    });
  });

  test("should throw 401 if access_token is missing from token response", async () => {
    mockAxios.post.mockResolvedValue({ data: {} });

    await expect(
      service.exchangeLinkedinCode({ code: "code" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message:
        "Failed to obtain a valid LinkedIn access token properties reference",
    });
  });

  test("should throw 401 if userinfo profile lookup fails", async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: "tok" } });
    mockAxios.get.mockRejectedValue(new Error("Network Timeout"));

    await expect(
      service.exchangeLinkedinCode({ code: "code" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message:
        "Failed to fetch profile info from LinkedIn OpenID endpoints: Network Timeout",
    });
  });

  test("should throw 400 if OpenID profile is missing sub or email", async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: "tok" } });
    mockAxios.get.mockResolvedValue({ data: { name: "Broken User" } });

    await expect(
      service.exchangeLinkedinCode({ code: "code" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        "LinkedIn authentication failed: structural OpenID profile attributes missing",
    });
  });
});
