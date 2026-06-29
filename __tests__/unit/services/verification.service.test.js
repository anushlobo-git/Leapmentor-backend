/**
 * @fileoverview Complete Domain Unit Tests Suite for Verification Service Module
 * @description Secures 100% statement, branch, function, and line execution coverage patterns.
 */

// Mock infrastructure configuration environment before loading the service layer
jest.mock("../../../config/env", () => ({
  appBaseUrl: "https://test.leapmentor.com",
  smtp: { fromEmail: "noreply@test.leapmentor.com" },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("mocked_secure_hash"),
  compare: jest.fn(),
}));

const createVerificationService = require("../../../services/verification.service");
const AppError = require("../../../utils/AppError");
const bcrypt = require("bcryptjs");

describe("Verification Service Unit Tests", () => {
  let mockUserRepo, mockTokenRepo, mockSendWithRetry, service;

  const testEmail = "user@test.com";
  const mockUserRecord = {
    _id: "u_101",
    email: testEmail,
    isEmailVerified: false,
    roles: ["mentor"],
  };

  beforeEach(() => {
    mockUserRepo = { findUserByEmail: jest.fn(), saveUser: jest.fn() };
    mockTokenRepo = {
      deleteTokensByUserId: jest.fn(),
      createToken: jest.fn(),
      findTokenByUserId: jest.fn(),
    };
    mockSendWithRetry = jest.fn();

    // Instantiate using the correct destructured named parameter layout
    service = createVerificationService({
      userRepository: mockUserRepo,
      verificationTokenRepository: mockTokenRepo,
      sendWithRetry: mockSendWithRetry,
      bcrypt,
    });

    // ✅ FIXED: Use Jest's native fake timers to freeze BOTH Date.now() and new Date() constructors
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-24T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers(); // ✅ FIXED: Safely restore environmental clock properties
    jest.clearAllMocks();
  });

  describe("initiateVerification Pipeline", () => {
    test("should throw an AppError if the email argument is omitted", async () => {
      await expect(service.initiateVerification(null)).rejects.toThrow(
        new AppError("email is required to process token distributions", 400),
      );
    });

    test("should throw a 404 AppError if the account cannot be found matching criteria", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(null);
      await expect(service.initiateVerification(testEmail)).rejects.toThrow(
        new AppError(
          "Account record matching input email criteria not found",
          404,
        ),
      );
    });

    test("should throw an AppError if the target profile registration email is already active", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue({
        _id: "u_101",
        isEmailVerified: true,
      });
      await expect(service.initiateVerification(testEmail)).rejects.toThrow(
        new AppError(
          "Verification conflict: Target profile email is already verified",
          400,
        ),
      );
    });

    test("should securely create token entries and dispatch multi-option verification emails", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);

      await service.initiateVerification(
        "  USER@test.com  ",
        " - Registration",
      );

      expect(mockUserRepo.findUserByEmail).toHaveBeenCalledWith(testEmail);
      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("u_101");
      expect(mockTokenRepo.createToken).toHaveBeenCalledWith(
        expect.objectContaining({
          user: "u_101",
          otp: "mocked_secure_hash",
          token: "mocked_secure_hash",
          expiresAt: expect.any(Date),
        }),
      );
      expect(mockSendWithRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          subject: "LeapMentor Email Verification - Registration",
        }),
        "Email Verification",
      );
    });
  });

  describe("processOtpVerification Strategy", () => {
    test("should throw 400 if email or otp parameters arrive missing", async () => {
      await expect(
        service.processOtpVerification(testEmail, null),
      ).rejects.toThrow(
        new AppError(
          "Both email and otp strings values are required parameter parameters",
          400,
        ),
      );
    });

    test("should throw 404 if the user email trace fails validation", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(null);
      await expect(
        service.processOtpVerification(testEmail, "123456"),
      ).rejects.toThrow(
        new AppError(
          "Account record matching input email criteria not found",
          404,
        ),
      );
    });

    test("should throw 400 if no active confirmation database entries are found", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      mockTokenRepo.findTokenByUserId.mockResolvedValue(null);

      await expect(
        service.processOtpVerification(testEmail, "123456"),
      ).rejects.toThrow(
        new AppError(
          "No active confirmation request found for this user account",
          400,
        ),
      );
    });

    test("should fail with a 400 code if token lifetime thresholds have expired", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      const expiredRecord = { expiresAt: new Date("2026-06-24T11:55:00.000Z") }; // 5 mins behind
      mockTokenRepo.findTokenByUserId.mockResolvedValue(expiredRecord);

      await expect(
        service.processOtpVerification(testEmail, "123456"),
      ).rejects.toThrow(
        new AppError(
          "The provided verification OTP has expired. Please request a new token code",
          400,
        ),
      );
      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("u_101");
    });

    test("should throw 400 if the provided verification code mismatch hashes", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        expiresAt: new Date("2026-06-24T12:05:00.000Z"),
        otp: "hashed",
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.processOtpVerification(testEmail, "111111"),
      ).rejects.toThrow(
        new AppError("Invalid verification code specified. Access denied", 400),
      );
    });

    test("should set profile state to verified and purge tokens upon match confirmation", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        expiresAt: new Date("2026-06-24T12:05:00.000Z"),
        otp: "hashed",
      });
      bcrypt.compare.mockResolvedValue(true);

      await service.processOtpVerification(testEmail, "123456");

      expect(mockUserRecord.isEmailVerified).toBe(true);
      expect(mockUserRepo.saveUser).toHaveBeenCalledWith(mockUserRecord);
      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("u_101");
    });
  });

  describe("processLinkVerification Strategy", () => {
    test("should throw 400 if verification token token or email items are missing", async () => {
      await expect(
        service.processLinkVerification(null, testEmail),
      ).rejects.toThrow(
        new AppError(
          "Both validation token and matching email queries parameters are required fields",
          400,
        ),
      );
    });

    test("should throw 404 if matching database tracking identifiers are missing", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(null);
      await expect(
        service.processLinkVerification("hexToken", testEmail),
      ).rejects.toThrow(
        new AppError(
          "Account record matching input email criteria not found",
          404,
        ),
      );
    });

    test("should throw 400 if no active token record exists for magic link handshakes", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      mockTokenRepo.findTokenByUserId.mockResolvedValue(null);

      await expect(
        service.processLinkVerification("hexToken", testEmail),
      ).rejects.toThrow(
        new AppError(
          "No active validation entries tracked matching this configuration",
          400,
        ),
      );
    });

    test("should throw 400 and purge indexes if the magic link expiration timeline drops behind context", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        expiresAt: new Date("2026-06-24T11:59:00.000Z"),
      });

      await expect(
        service.processLinkVerification("hexToken", testEmail),
      ).rejects.toThrow(
        new AppError(
          "This verification magic link has expired. Please re-trigger a new setup profile link",
          400,
        ),
      );
      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("u_101");
    });

    test("should throw 400 if cryptographic comparison checks fail", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        expiresAt: new Date("2026-06-24T12:05:00.000Z"),
        token: "hashed",
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.processLinkVerification("invalidHex", testEmail),
      ).rejects.toThrow(
        new AppError(
          "Invalid or corrupted security token context block parameter",
          400,
        ),
      );
    });

    test("should approve accounts and isolate primary client group permissions matching user fields", async () => {
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUserRecord);
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        expiresAt: new Date("2026-06-24T12:05:00.000Z"),
        token: "hashed",
      });
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.processLinkVerification(
        "validHex",
        testEmail,
      );

      expect(mockUserRecord.isEmailVerified).toBe(true);
      expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("u_101");
      expect(result).toEqual({ role: "mentor" });
    });

    test("should fall back gracefully to a null role output context if roles array attributes are missing", async () => {
      const statelessUser = {
        _id: "u_555",
        email: testEmail,
        isEmailVerified: false,
        roles: null,
      };
      mockUserRepo.findUserByEmail.mockResolvedValue(statelessUser);
      mockTokenRepo.findTokenByUserId.mockResolvedValue({
        expiresAt: new Date("2026-06-24T12:05:00.000Z"),
        token: "hashed",
      });
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.processLinkVerification(
        "validHex",
        testEmail,
      );
      expect(result).toEqual({ role: null });
    });
  });
});
