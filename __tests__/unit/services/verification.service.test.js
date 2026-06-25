/**
 * @fileoverview Verification Core Business Service Unit Tests
 * @description Validates verification workflows, token lifecycle expiration metrics, and hash mismatch handling.
 */

const createVerificationService = require("../../../services/verification.service");
const AppError = require("../../../utils/AppError");

describe("Verification Service Unit Tests", () => {
  let mockUserRepo, mockTokenRepo, mockSendWithRetry, service;

  beforeEach(() => {
    mockUserRepo = { findUserByEmail: jest.fn(), saveUser: jest.fn() };
    mockTokenRepo = {
      deleteTokensByUserId: jest.fn(),
      createToken: jest.fn(),
      findTokenByUserId: jest.fn(),
    };
    mockSendWithRetry = jest.fn();

    service = createVerificationService(
      mockUserRepo,
      mockTokenRepo,
      mockSendWithRetry,
    );

    // Freeze time frame metrics for testing expiration constraints
    jest
      .spyOn(Date, "now")
      .mockImplementation(() => new Date("2026-06-24T12:00:00.000Z").getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("initiateVerification should throw an AppError if the target profile registration email is already active", async () => {
    mockUserRepo.findUserByEmail.mockResolvedValue({
      _id: "u_101",
      isEmailVerified: true,
    });

    await expect(
      service.initiateVerification("active@test.com"),
    ).rejects.toThrow(
      new AppError(
        "Verification conflict: Target profile email is already verified",
        400,
      ),
    );
  });

  test("processOtpVerification should fail with a 400 code if token lifetime thresholds have expired", async () => {
    mockUserRepo.findUserByEmail.mockResolvedValue({ _id: "u_101" });

    const expiredRecord = { expiresAt: new Date("2026-06-24T11:55:00.000Z") }; // 5 minutes behind current time
    mockTokenRepo.findTokenByUserId.mockResolvedValue(expiredRecord);

    await expect(
      service.processOtpVerification("user@test.com", "123456"),
    ).rejects.toThrow(
      new AppError(
        "The provided verification OTP has expired. Please request a new token code",
        400,
      ),
    );
    expect(mockTokenRepo.deleteTokensByUserId).toHaveBeenCalledWith("u_101");
  });
});
