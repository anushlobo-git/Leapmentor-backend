/**
 * @fileoverview Forgot Password Service Unit Tests
 * @description Full branch coverage for sendForgotPasswordOtp, verifyResetOtp, resetPassword,
 * and the private _generateSecureOtp helper.
 */

const createForgotPasswordService = require("../../../services/forgotPassword.service");
const bcrypt = require("bcryptjs");
const AppError = require("../../../utils/AppError");

// Mock bcrypt so tests run fast and are deterministic
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_value"),
  compare: jest.fn(),
}));

describe("Forgot Password Service Unit Tests", () => {
  let mockUserRepo, mockTokenRepo, mockSendWithRetry, service;

  const FIXED_NOW = new Date("2026-06-24T12:00:00.000Z").getTime();
  const FUTURE_EXPIRY = new Date(FIXED_NOW + 10 * 60 * 1000); // 10 min ahead → not expired
  const PAST_EXPIRY = new Date(FIXED_NOW - 10 * 60 * 1000); // 10 min behind → expired

  beforeEach(() => {
    // CRITICAL FIX: Anchor the entire system clock using fake timers so new Date() is fully controlled
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);

    mockUserRepo = {
      findUserByEmail: jest.fn(),
      saveUser: jest.fn(),
    };
    mockTokenRepo = {
      deleteTokensByUserId: jest.fn(),
      createToken: jest.fn(),
      findTokenByUserId: jest.fn(),
      saveToken: jest.fn(),
    };
    mockSendWithRetry = jest.fn().mockResolvedValue();

    service = createForgotPasswordService({
      userRepo: mockUserRepo,
      verificationTokenRepo: mockTokenRepo,
      sendWithRetry: mockSendWithRetry,
      environmentConfig: { fromEmail: "test@lm.com" },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Restore system clock mapping integrity
  });

  // ───────────────────────────────────────────────────────────────────────────
  // sendForgotPasswordOtp
  // ───────────────────────────────────────────────────────────────────────────
  describe("sendForgotPasswordOtp", () => {
    test("should throw 400 when email is missing (!email guard)", async () => {
      await expect(service.sendForgotPasswordOtp("")).rejects.toMatchObject({
        statusCode: 400,
        message: "email is required",
      });

      await expect(
        service.sendForgotPasswordOtp(undefined),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "email is required",
      });
    });

    test("should return ambiguous success message when email is not registered (no token created)", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(null);

      const result = await service.sendForgotPasswordOtp("ghost@test.com");

      expect(result.message).toBe(
        "If this email exists, an OTP has been sent.",
      );
      expect(mockTokenRepo.createToken).not.toHaveBeenCalled();
      expect(mockSendWithRetry).not.toHaveBeenCalled();
    });

    test("should normalise email to lowercase, delete old token, create new token, and send email", async () => {
      const mockUser = { _id: "user_1", email: "user@test.com" };
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockTokenRepo.deleteTokensByUserId.mockResolvedValue();
      mockTokenRepo.createToken.mockResolvedValue();

      const result = await service.sendForgotPasswordOtp("  USER@TEST.COM  ");

      expect(mockUserRepo.findUserByEmail).toHaveBeenCalledWith(
        "user@test.com",
      );
      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("user_1");
      expect(mockTokenRepo.createToken).toHaveBeenCalledWith(
        expect.objectContaining({
          user: "user_1",
          otp: "hashed_value",
          expiresAt: expect.any(Date),
        }),
      );
      expect(mockSendWithRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "test@lm.com",
          to: "user@test.com",
          subject: expect.stringContaining("Reset your password"),
        }),
        "Forgot Password OTP",
      );
      expect(result.message).toBe(
        "If this email exists, an OTP has been sent.",
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // verifyResetOtp
  // ───────────────────────────────────────────────────────────────────────────
  describe("verifyResetOtp", () => {
    test("should throw 400 when email is missing", async () => {
      await expect(service.verifyResetOtp("", "123456")).rejects.toMatchObject({
        statusCode: 400,
        message: "email and otp are required",
      });
    });

    test("should throw 400 when otp is missing", async () => {
      await expect(
        service.verifyResetOtp("user@test.com", ""),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "email and otp are required",
      });
    });

    test("should throw 400 when user is not found", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.verifyResetOtp("ghost@test.com", "123456"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid OTP",
      });
    });

    test("should throw 400 when no token record exists (!record?.otp)", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue(null);

      await expect(
        service.verifyResetOtp("user@test.com", "123456"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "No reset request found. Please request a new OTP.",
      });
    });

    test("should throw 400 when record exists but otp field is missing (!record?.otp)", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        otp: null,
        expiresAt: FUTURE_EXPIRY,
      });

      await expect(
        service.verifyResetOtp("user@test.com", "123456"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "No reset request found. Please request a new OTP.",
      });
    });

    test("should throw 400 and delete token when OTP is expired", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        otp: "hashed_value",
        expiresAt: PAST_EXPIRY,
      });

      await expect(
        service.verifyResetOtp("user@test.com", "123456"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "OTP expired. Please request a new one.",
      });

      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("user_1");
    });

    test("should throw 400 when OTP hash comparison fails (invalid OTP)", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        otp: "hashed_value",
        expiresAt: FUTURE_EXPIRY,
      });
      bcrypt.compare.mockResolvedValue(false); // wrong OTP

      await expect(
        service.verifyResetOtp("user@test.com", "wrong"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid OTP",
      });
    });

    test("should extend expiry, save token, and return success on valid OTP", async () => {
      const mockRecord = {
        otp: "hashed_value",
        expiresAt: new Date(FUTURE_EXPIRY),
      };
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue(mockRecord);
      bcrypt.compare.mockResolvedValue(true);
      mockTokenRepo.saveToken.mockResolvedValue();

      const result = await service.verifyResetOtp(
        "  USER@TEST.COM  ",
        "123456",
      );

      expect(mockRecord.expiresAt.getTime()).toBe(FIXED_NOW + 5 * 60 * 1000);
      expect(mockTokenRepo.saveToken).toHaveBeenCalledWith(mockRecord);
      expect(result).toEqual({
        message: "OTP verified",
        email: "user@test.com",
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // resetPassword
  // ───────────────────────────────────────────────────────────────────────────
  describe("resetPassword", () => {
    test("should throw 400 when email is missing", async () => {
      await expect(
        service.resetPassword({ otp: "123456", newPassword: "newpass123" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "email, otp and newPassword are required",
      });
    });

    test("should throw 400 when otp is missing", async () => {
      await expect(
        service.resetPassword({ email: "u@t.com", newPassword: "newpass123" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "email, otp and newPassword are required",
      });
    });

    test("should throw 400 when newPassword is missing", async () => {
      await expect(
        service.resetPassword({ email: "u@t.com", otp: "123456" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "email, otp and newPassword are required",
      });
    });

    test("should throw 400 when newPassword is shorter than MIN_PASSWORD_LENGTH (6 chars)", async () => {
      await expect(
        service.resetPassword({
          email: "u@t.com",
          otp: "123456",
          newPassword: "abc",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Password must be at least 6 characters",
      });
    });

    test("should throw 400 when user is not found", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: "ghost@t.com",
          otp: "123456",
          newPassword: "validpass",
        }),
      ).rejects.toMatchObject({ statusCode: 400, message: "Invalid request" });
    });

    test("should throw 400 when no token record exists (!record?.otp)", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: "u@t.com",
          otp: "123456",
          newPassword: "validpass",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Session expired. Please start over.",
      });
    });

    test("should throw 400 when record otp field is falsy (!record?.otp)", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        otp: null,
        expiresAt: FUTURE_EXPIRY,
      });

      await expect(
        service.resetPassword({
          email: "u@t.com",
          otp: "123456",
          newPassword: "validpass",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Session expired. Please start over.",
      });
    });

    test("should throw 400 and delete token when session is expired", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        otp: "hashed_value",
        expiresAt: PAST_EXPIRY,
      });

      await expect(
        service.resetPassword({
          email: "u@t.com",
          otp: "123456",
          newPassword: "validpass",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Session expired. Please start over.",
      });

      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("user_1");
    });

    test("should throw 400 when OTP comparison fails (invalid session)", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "user_1" });
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        otp: "hashed_value",
        expiresAt: FUTURE_EXPIRY,
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.resetPassword({
          email: "u@t.com",
          otp: "wrong",
          newPassword: "validpass",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid session. Please start over.",
      });
    });

    test("should hash new password, save user, delete token, and return success on valid reset", async () => {
      const mockUser = {
        _id: "user_1",
        email: "u@t.com",
        password: "old_hash",
      };
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        otp: "hashed_value",
        expiresAt: FUTURE_EXPIRY,
      });
      bcrypt.compare.mockResolvedValue(true);
      mockUserRepo.saveUser.mockResolvedValue();
      mockTokenRepo.deleteTokensByUserId.mockResolvedValue();

      const result = await service.resetPassword({
        email: "  U@T.COM  ",
        otp: "123456",
        newPassword: "newSecurePass",
      });

      expect(mockUserRepo.findUserByEmail).toHaveBeenCalledWith("u@t.com");
      expect(bcrypt.hash).toHaveBeenCalledWith("newSecurePass", 10);
      expect(mockUser.password).toBe("hashed_value");
      expect(mockUserRepo.saveUser).toHaveBeenCalledWith(mockUser);
      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("user_1");
      expect(result).toEqual({
        message: "Password reset successfully. You can now login.",
      });
    });
  });
});
