const createForgotPasswordService = require("../../../services/forgotPassword.service");
const AppError = require("../../../utils/AppError");
const bcrypt = require("bcryptjs");

describe("Forgot Password Service Unit Tests", () => {
  let mockUserRepo, mockTokenRepo, mockSendWithRetry, service;

  beforeEach(() => {
    mockUserRepo = { findUserByEmail: jest.fn(), saveUser: jest.fn() };
    mockTokenRepo = {
      deleteTokensByUserId: jest.fn(),
      createToken: jest.fn(),
      findTokenByUserId: jest.fn(),
      saveToken: jest.fn(),
    };
    mockSendWithRetry = jest.fn();
    service = createForgotPasswordService(
      mockUserRepo,
      mockTokenRepo,
      mockSendWithRetry,
      { fromEmail: "test@lm.com" },
    );

    jest
      .spyOn(Date, "now")
      .mockImplementation(() => new Date("2026-06-24T12:00:00.000Z").getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("sendForgotPasswordOtp should return an ambiguous message if the email is unregistered", async () => {
    mockUserRepo.findUserByEmail.mockResolvedValue(null);
    const result = await service.sendForgotPasswordOtp("ghost@test.com");
    expect(result.message).toBe("If this email exists, an OTP has been sent.");
    expect(mockTokenRepo.createToken).not.toHaveBeenCalled();
  });

  test("verifyResetOtp should throw if token session lifetime window has expired", async () => {
    mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "u1" });
    mockTokenRepo.findTokenByUserId.mockResolvedValue({
      otp: "hashed",
      expiresAt: new Date("2026-06-24T11:00:00.000Z"),
    });

    await expect(
      service.verifyResetOtp("u1@test.com", "123456"),
    ).rejects.toThrow(
      new AppError("OTP expired. Please request a new one.", 400),
    );
    expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("u1");
  });
});
