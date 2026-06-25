/**
 * @fileoverview Admin Mentor Verification Service Unit Tests
 */

const createAdminVerificationService = require("../../../services/admin-verification.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/mentorProfile.mapper", () => ({
  toMentorProfileDTO: jest.fn(() => ({
    user: { name: "John Doe", email: "j@test.com" },
    industry: "Tech",
  })),
}));

describe("Admin Verification Service Suite", () => {
  let mockMentorProfileRepo,
    mockFireAndForgetEmail,
    mockSendMentorVerifiedEmail,
    service;

  beforeEach(() => {
    mockMentorProfileRepo = {
      findAllMentorProfiles: jest.fn(),
      findMentorProfileById: jest.fn(),
      findMentorProfileByIdWithUser: jest.fn(),
      saveMentorProfile: jest.fn(),
    };
    mockFireAndForgetEmail = jest.fn((fn) => fn());
    mockSendMentorVerifiedEmail = jest.fn();

    service = createAdminVerificationService(
      mockMentorProfileRepo,
      mockFireAndForgetEmail,
      mockSendMentorVerifiedEmail,
    );
  });

  test("verifyMentorService should successfully update status and trigger confirmation notifications", async () => {
    const mockProfile = {
      _id: "prof123",
      verificationStatus: "unverified",
      user: { name: "Alice", email: "alice@test.com" },
    };
    mockMentorProfileRepo.findMentorProfileByIdWithUser.mockResolvedValue(
      mockProfile,
    );

    const result = await service.verifyMentorService("prof123");

    expect(mockProfile.verificationStatus).toBe("verified");
    expect(mockMentorProfileRepo.saveMentorProfile).toHaveBeenCalledWith(
      mockProfile,
    );
    expect(mockFireAndForgetEmail).toHaveBeenCalled();
    expect(result.verificationStatus).toBe("verified");
  });

  test("getMentorVerificationByIdService should throw a 404 error if profile tracking entries do not exist", async () => {
    mockMentorProfileRepo.findMentorProfileById.mockResolvedValue(null);
    await expect(
      service.getMentorVerificationByIdService("missing404"),
    ).rejects.toThrow(new AppError("Mentor profile not found.", 404));
  });
});
