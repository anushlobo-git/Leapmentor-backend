/**
 * @fileoverview Admin Mentor Verification Service Unit Tests
 * @description Full branch coverage for all four service methods.
 */

const createAdminVerificationService = require("../../../services/admin-verification.service");
const AppError = require("../../../utils/AppError");

// toMentorProfileDTO is imported directly inside the service, so jest.mock works here
jest.mock("../../../mappers/mentorProfile.mapper", () => ({
  toMentorProfileDTO: jest.fn((p) => ({
    user: {
      name: p.user?.name || "John Doe",
      email: p.user?.email || "j@test.com",
    },
    industry: "Tech",
  })),
}));

describe("Admin Verification Service", () => {
  let mockMentorProfileRepository;
  let mockFireAndForgetEmail;
  let mockSendMentorVerifiedEmail;
  let service;

  beforeEach(() => {
    mockMentorProfileRepository = {
      findAllMentorProfiles: jest.fn(),
      findMentorProfileById: jest.fn(),
      findMentorProfileByIdWithUser: jest.fn(),
      saveMentorProfile: jest.fn(),
    };
    mockFireAndForgetEmail = jest.fn((fn) => fn());
    mockSendMentorVerifiedEmail = jest.fn();

    // ✅ Correct instantiation — matches the destructured signature
    service = createAdminVerificationService({
      mentorProfileRepository: mockMentorProfileRepository,
      fireAndForgetEmail: mockFireAndForgetEmail,
      sendMentorVerifiedEmail: mockSendMentorVerifiedEmail,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getAllMentorVerificationsService ────────────────────────────────────
  describe("getAllMentorVerificationsService", () => {
    test("should return mapped mentor profiles with user and mentorProfile fields", async () => {
      mockMentorProfileRepository.findAllMentorProfiles.mockResolvedValue([
        { user: { name: "Alice", email: "alice@test.com" } },
        { user: { name: "Bob", email: "bob@test.com" } },
      ]);

      const result = await service.getAllMentorVerificationsService();

      expect(
        mockMentorProfileRepository.findAllMentorProfiles,
      ).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("user");
      expect(result[0]).toHaveProperty("mentorProfile");
      // user field is lifted out; mentorProfile.user should be undefined
      expect(result[0].mentorProfile.user).toBeUndefined();
    });

    test("should return an empty array when no profiles exist", async () => {
      mockMentorProfileRepository.findAllMentorProfiles.mockResolvedValue([]);

      const result = await service.getAllMentorVerificationsService();

      expect(result).toEqual([]);
    });
  });

  // ── getMentorVerificationByIdService ────────────────────────────────────
  describe("getMentorVerificationByIdService", () => {
    test("should return mapped profile when found", async () => {
      mockMentorProfileRepository.findMentorProfileById.mockResolvedValue({
        user: { name: "Alice", email: "alice@test.com" },
      });

      const result = await service.getMentorVerificationByIdService("prof1");

      expect(
        mockMentorProfileRepository.findMentorProfileById,
      ).toHaveBeenCalledWith("prof1");
      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("mentorProfile");
      expect(result.mentorProfile.user).toBeUndefined();
    });

    test("should throw 404 if profile is not found", async () => {
      mockMentorProfileRepository.findMentorProfileById.mockResolvedValue(null);

      await expect(
        service.getMentorVerificationByIdService("missing404"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Mentor profile not found.",
      });
    });
  });

  // ── verifyMentorService ─────────────────────────────────────────────────
  describe("verifyMentorService", () => {
    test("should update status to verified, save, and send email when mentor has an email", async () => {
      const mockProfile = {
        _id: "prof123",
        verificationStatus: "unverified",
        user: { name: "Alice", email: "alice@test.com" },
      };
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        mockProfile,
      );

      const result = await service.verifyMentorService("prof123");

      expect(mockProfile.verificationStatus).toBe("verified");
      expect(
        mockMentorProfileRepository.saveMentorProfile,
      ).toHaveBeenCalledWith(mockProfile);
      expect(mockFireAndForgetEmail).toHaveBeenCalled();
      expect(mockSendMentorVerifiedEmail).toHaveBeenCalledWith({
        mentorName: "Alice",
        mentorEmail: "alice@test.com",
      });
      expect(result).toEqual({
        mentorProfileId: "prof123",
        verificationStatus: "verified",
        mentorName: "Alice",
      });
    });

    test("should skip sending email if mentor has no email", async () => {
      // Branch: if (mentorEmail)
      const mockProfile = {
        _id: "prof124",
        verificationStatus: "unverified",
        user: { name: "NoEmail Mentor" }, // no email field
      };
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        mockProfile,
      );

      await service.verifyMentorService("prof124");

      expect(mockFireAndForgetEmail).not.toHaveBeenCalled();
    });

    test("should use fallback name 'Mentor' when user has no name", async () => {
      // Branch: profile.user?.name || "Mentor"
      const mockProfile = {
        _id: "prof125",
        verificationStatus: "unverified",
        user: {}, // no name, no email
      };
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        mockProfile,
      );

      const result = await service.verifyMentorService("prof125");

      expect(result.mentorName).toBe("Mentor");
    });

    test("should throw 404 if profile is not found", async () => {
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        null,
      );

      await expect(
        service.verifyMentorService("missing"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Mentor profile not found.",
      });
    });

    test("should throw 400 if mentor is already verified", async () => {
      // Branch: profile.verificationStatus === STATUS_VERIFIED
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        {
          _id: "prof126",
          verificationStatus: "verified",
          user: { name: "Alice", email: "alice@test.com" },
        },
      );

      await expect(
        service.verifyMentorService("prof126"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Mentor is already verified.",
      });

      expect(
        mockMentorProfileRepository.saveMentorProfile,
      ).not.toHaveBeenCalled();
    });
  });

  // ── revokeMentorVerificationService ────────────────────────────────────
  describe("revokeMentorVerificationService", () => {
    test("should update status to unverified and return result", async () => {
      const mockProfile = {
        _id: "prof200",
        verificationStatus: "verified",
        user: { name: "Bob" },
      };
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        mockProfile,
      );

      const result = await service.revokeMentorVerificationService("prof200");

      expect(mockProfile.verificationStatus).toBe("unverified");
      expect(
        mockMentorProfileRepository.saveMentorProfile,
      ).toHaveBeenCalledWith(mockProfile);
      expect(result).toEqual({
        mentorProfileId: "prof200",
        verificationStatus: "unverified",
        mentorName: "Bob",
      });
    });

    test("should use fallback name 'Mentor' when user has no name", async () => {
      // Branch: profile.user?.name || "Mentor"
      const mockProfile = {
        _id: "prof201",
        verificationStatus: "verified",
        user: {},
      };
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        mockProfile,
      );

      const result = await service.revokeMentorVerificationService("prof201");

      expect(result.mentorName).toBe("Mentor");
    });

    test("should throw 404 if profile is not found", async () => {
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        null,
      );

      await expect(
        service.revokeMentorVerificationService("missing"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Mentor profile not found.",
      });
    });

    test("should throw 400 if mentor is already unverified", async () => {
      // Branch: profile.verificationStatus === STATUS_UNVERIFIED
      mockMentorProfileRepository.findMentorProfileByIdWithUser.mockResolvedValue(
        {
          _id: "prof202",
          verificationStatus: "unverified",
          user: { name: "Bob" },
        },
      );

      await expect(
        service.revokeMentorVerificationService("prof202"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Mentor is already unverified.",
      });

      expect(
        mockMentorProfileRepository.saveMentorProfile,
      ).not.toHaveBeenCalled();
    });
  });
});
