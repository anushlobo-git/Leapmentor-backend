/**
 * @fileoverview User Account Registration Controller Unit Tests
 */

const createRegisterController = require("../../../controllers/register.controller");
const { successEnvelope } = require("../../helpers/apiResponse");

describe("User Account Registration Controller Unit Tests", () => {
  let mockAuthService, mockCookieUtils, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockAuthService = { registerUser: jest.fn() };
    mockCookieUtils = { setAuthCookies: jest.fn() };
    controller = createRegisterController({
      authService: mockAuthService,
      cookieUtils: mockCookieUtils,
    });
    mockReq = {
      body: {
        name: "Jane Doe",
        email: "jane.doe@test.com",
        password: "password123456",
        roles: ["mentee"],
        termsAccepted: true,
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("outcome 'created': 201 status and auth cookies for a brand-new account", async () => {
    const mockServicePayload = {
      outcome: "created",
      isNewUser: true,
      loggedIn: false,
      accessToken: "mocked_access_jwt_string",
      refreshToken: "mocked_refresh_jwt_string",
      user: { _id: "usr_reg_999", name: "Jane Doe", roles: ["mentee"] },
    };
    mockAuthService.registerUser.mockResolvedValue(mockServicePayload);

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockAuthService.registerUser).toHaveBeenCalledWith(mockReq.body);
    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(
      mockRes,
      "mocked_refresh_jwt_string",
      "mentee",
    );
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          outcome: "created",
          isNewUser: true,
          loggedIn: false,
          user: mockServicePayload.user,
          accessToken: "mocked_access_jwt_string",
        },
        "Registered successfully",
      ),
    );
  });

  test("outcome 'created' with no roles sets a null role cookie", async () => {
    mockAuthService.registerUser.mockResolvedValue({
      outcome: "created",
      isNewUser: true,
      loggedIn: false,
      accessToken: "mocked_access_jwt_string",
      refreshToken: "mocked_refresh_jwt_string",
      user: { _id: "usr_reg_999", name: "Jane Doe" },
    });

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(
      mockRes,
      "mocked_refresh_jwt_string",
      null,
    );
  });

  test("outcome 'role_added' + verified: 200, auth cookies, and a logged-in session", async () => {
    const user = {
      _id: "usr_multi_1",
      name: "Jane Doe",
      roles: ["mentee", "mentor"],
    };
    mockAuthService.registerUser.mockResolvedValue({
      outcome: "role_added",
      isNewUser: false,
      loggedIn: true,
      accessToken: "mocked_access_jwt_string",
      refreshToken: "mocked_refresh_jwt_string",
      user,
    });

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    // mentor wins the ROLE_PRIORITY tie-break for the routing-hint cookie.
    expect(mockCookieUtils.setAuthCookies).toHaveBeenCalledWith(
      mockRes,
      "mocked_refresh_jwt_string",
      "mentor",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          outcome: "role_added",
          isNewUser: false,
          loggedIn: true,
          user,
          accessToken: "mocked_access_jwt_string",
        },
        "Role added to your account",
      ),
    );
  });

  test("outcome 'role_added' + unverified: 200, NO cookies, routed to verify", async () => {
    const user = {
      _id: "usr_multi_2",
      name: "Jane Doe",
      roles: ["mentee", "mentor"],
    };
    mockAuthService.registerUser.mockResolvedValue({
      outcome: "role_added",
      isNewUser: false,
      loggedIn: false,
      email: "jane.doe@test.com",
      user,
    });

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCookieUtils.setAuthCookies).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          outcome: "role_added",
          isNewUser: false,
          loggedIn: false,
          user,
          email: "jane.doe@test.com",
        },
        "Role added to your account",
      ),
    );
  });

  test("outcome 'already_registered': 200, NO cookies, no session", async () => {
    mockAuthService.registerUser.mockResolvedValue({
      outcome: "already_registered",
      isNewUser: false,
      loggedIn: false,
      email: "jane.doe@test.com",
    });

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCookieUtils.setAuthCookies).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          outcome: "already_registered",
          isNewUser: false,
          loggedIn: false,
          email: "jane.doe@test.com",
        },
        "You already have an account for this role",
      ),
    );
  });

  test("outcome 'login_required': 200, NO cookies, no session", async () => {
    mockAuthService.registerUser.mockResolvedValue({
      outcome: "login_required",
      isNewUser: false,
      loggedIn: false,
      email: "jane.doe@test.com",
    });

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCookieUtils.setAuthCookies).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          outcome: "login_required",
          isNewUser: false,
          loggedIn: false,
          email: "jane.doe@test.com",
        },
        "An account with this email already exists",
      ),
    );
  });

  test("should capture service exceptions and delegate them to next() for global catching middleware", async () => {
    const mockException = new Error("Invalid role.");
    mockAuthService.registerUser.mockRejectedValue(mockException);

    await controller.register(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockException);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
