const createGoogleAuthService = require("../../../services/googleAuth.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/user.mapper", () => ({
  toUserDTO: jest.fn((user) => ({ DTO: true, ...user })),
}));

describe("googleAuth.service", () => {
  let userRepository,
    oauthAccountRepository,
    walletService,
    authUtils,
    jwt,
    config,
    logger,
    service;

  const makeTicket = (payload) => ({
    getPayload: jest.fn().mockReturnValue(payload),
  });

  const defaultPayload = {
    email: "user@test.com",
    name: "Test User",
    sub: "google_sub_123",
    email_verified: true,
  };

  beforeEach(() => {
    userRepository = { findUserByEmail: jest.fn(), createUser: jest.fn() };
    oauthAccountRepository = {
      findOAuthAccount: jest.fn(),
      createOAuthAccount: jest.fn(),
    };
    walletService = { createWalletsForRoles: jest.fn() };
    authUtils = {
      googleClient: { verifyIdToken: jest.fn() },
      validateRoles: jest
        .fn()
        .mockReturnValue({ valid: true, uniqueRoles: ["mentee"] }),
      signAccessToken: jest.fn().mockReturnValue("access_token"),
      signRefreshToken: jest.fn().mockReturnValue("refresh_token"),
    };
    jwt = { decode: jest.fn().mockReturnValue({ aud: "client_id" }) };
    config = { googleClientId: "real_client_id" };
    logger = { info: jest.fn() };

    service = createGoogleAuthService({
      userRepository,
      oauthAccountRepository,
      walletService,
      authUtils,
      jwt,
      config,
      logger,
    });
  });

  afterEach(() => jest.clearAllMocks());

  test("throws 400 if credential missing", () =>
    expect(service.googleAuthUser({ credential: null })).rejects.toMatchObject({
      statusCode: 400,
    }));

  test("throws 500 if googleClientId missing", () => {
    config.googleClientId = undefined;
    return expect(
      service.googleAuthUser({ credential: "jwt" }),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  test("throws 401 if verifyIdToken throws", () => {
    authUtils.googleClient.verifyIdToken.mockRejectedValue(
      new Error("expired"),
    );
    return expect(
      service.googleAuthUser({ credential: "jwt" }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("throws 400 if terms not accepted for new user", () => {
    authUtils.googleClient.verifyIdToken.mockResolvedValue(
      makeTicket(defaultPayload),
    );
    userRepository.findUserByEmail.mockResolvedValue(null);
    return expect(
      service.googleAuthUser({ credential: "jwt", termsAccepted: false }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("throws 400 if validateRoles returns invalid", () => {
    authUtils.googleClient.verifyIdToken.mockResolvedValue(
      makeTicket(defaultPayload),
    );
    userRepository.findUserByEmail.mockResolvedValue(null);
    authUtils.validateRoles.mockReturnValue({
      valid: false,
      message: "bad role",
    });
    return expect(
      service.googleAuthUser({
        credential: "jwt",
        termsAccepted: true,
        roles: ["bad"],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("creates user with default role when roles array omitted", async () => {
    authUtils.googleClient.verifyIdToken.mockResolvedValue(
      makeTicket(defaultPayload),
    );
    userRepository.findUserByEmail.mockResolvedValue(null);
    userRepository.createUser.mockResolvedValue({
      _id: "new1",
      email: "user@test.com",
    });
    oauthAccountRepository.findOAuthAccount.mockResolvedValue(null);

    const result = await service.googleAuthUser({
      credential: "jwt",
      termsAccepted: true,
    });
    expect(authUtils.validateRoles).toHaveBeenCalledWith(["mentee"]);
    expect(result.isNewUser).toBe(true);
  });

  test("creates user with isEmailVerified false when payload flag is false", async () => {
    authUtils.googleClient.verifyIdToken.mockResolvedValue(
      makeTicket({ ...defaultPayload, email_verified: false }),
    );
    userRepository.findUserByEmail.mockResolvedValue(null);
    userRepository.createUser.mockResolvedValue({
      _id: "new2",
      email: "user@test.com",
    });
    oauthAccountRepository.findOAuthAccount.mockResolvedValue(null);

    await service.googleAuthUser({
      credential: "jwt",
      termsAccepted: true,
      roles: ["mentee"],
    });
    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ isEmailVerified: false }),
    );
  });

  test("registers new user: wallet + oauth created, isNewUser true", async () => {
    authUtils.googleClient.verifyIdToken.mockResolvedValue(
      makeTicket(defaultPayload),
    );
    userRepository.findUserByEmail.mockResolvedValue(null);
    userRepository.createUser.mockResolvedValue({
      _id: "new3",
      email: "user@test.com",
    });
    oauthAccountRepository.findOAuthAccount.mockResolvedValue(null);

    const result = await service.googleAuthUser({
      credential: "jwt",
      termsAccepted: true,
      roles: ["mentee"],
    });
    expect(walletService.createWalletsForRoles).toHaveBeenCalledWith("new3", [
      "mentee",
    ]);
    expect(oauthAccountRepository.createOAuthAccount).toHaveBeenCalledWith({
      user: "new3",
      provider: "google",
      providerId: "google_sub_123",
    });
    expect(result.isNewUser).toBe(true);
  });

  test("authenticates existing user without creating account or wallet", async () => {
    authUtils.googleClient.verifyIdToken.mockResolvedValue(
      makeTicket(defaultPayload),
    );
    userRepository.findUserByEmail.mockResolvedValue({
      _id: "u1",
      email: "user@test.com",
    });
    oauthAccountRepository.findOAuthAccount.mockResolvedValue({
      _id: "oauth1",
    });

    const result = await service.googleAuthUser({ credential: "jwt" });
    expect(userRepository.createUser).not.toHaveBeenCalled();
    expect(result.isNewUser).toBe(false);
    expect(result.user).toMatchObject({ DTO: true, _id: "u1" });
  });

  test("creates oauth link for existing user if not linked yet", async () => {
    authUtils.googleClient.verifyIdToken.mockResolvedValue(
      makeTicket(defaultPayload),
    );
    userRepository.findUserByEmail.mockResolvedValue({
      _id: "u2",
      email: "user@test.com",
    });
    oauthAccountRepository.findOAuthAccount.mockResolvedValue(null);

    await service.googleAuthUser({ credential: "jwt" });
    expect(oauthAccountRepository.createOAuthAccount).toHaveBeenCalledWith({
      user: "u2",
      provider: "google",
      providerId: "google_sub_123",
    });
  });
});
