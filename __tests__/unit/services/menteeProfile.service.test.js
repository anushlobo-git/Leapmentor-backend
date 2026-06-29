const createMenteeProfileService = require("../../../services/menteeProfile.service");

jest.mock("../../../mappers/menteeProfile.mapper", () => ({
  toMenteeProfileDTO: jest.fn((val) => val),
}));

describe("Mentee Profile Service", () => {
  let mockRepo, service;

  const mockProfile = { _id: "p1", user: "u1", currentRole: "Dev" };

  beforeEach(() => {
    mockRepo = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      findByUserIdWithAccountInfo: jest.fn(),
      findOneAndUpdateByUserId: jest.fn(),
      findPublishedByUserId: jest.fn(),
    };
    service = createMenteeProfileService({ menteeProfileRepository: mockRepo });
  });

  afterEach(() => jest.clearAllMocks());

  // ── createProfile ───────────────────────────────────────────────────────
  describe("createProfile", () => {
    test("throws 409 if profile already exists", async () => {
      mockRepo.findByUserId.mockResolvedValue(mockProfile);

      await expect(service.createProfile("u1", {})).rejects.toMatchObject({
        statusCode: 409,
        message: "Profile already exists. Use update instead.",
      });
    });

    test("creates profile with provided data fields", async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockProfile);

      const data = {
        currentRole: "Dev",
        industry: "Tech",
        company: "Acme",
        yearsOfExperience: 3,
        bio: "Bio",
        profilePicture: "pic.png",
        profilePictureFileName: "pic.png",
        linkedInUrl: "linkedin.com",
        portfolioUrl: "portfolio.com",
        skills: ["JS"],
        interestedFields: ["AI"],
        communicationPreferences: ["email"],
        languages: ["French"],
      };

      const result = await service.createProfile("u1", data);

      expect(mockRepo.create).toHaveBeenCalledWith({
        user: "u1",
        currentRole: "Dev",
        industry: "Tech",
        company: "Acme",
        yearsOfExperience: 3,
        bio: "Bio",
        profilePicture: "pic.png",
        profilePictureFileName: "pic.png",
        linkedInUrl: "linkedin.com",
        portfolioUrl: "portfolio.com",
        skills: ["JS"],
        interestedFields: ["AI"],
        communicationPreferences: ["email"],
        languages: ["French"],
        isProfileComplete: true,
        isProfilePublished: true,
      });
      expect(result).toBe(mockProfile);
    });

    test("applies all default fallback values when optional fields are omitted", async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockProfile);

      await service.createProfile("u1", { currentRole: "Dev" });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          yearsOfExperience: 0,
          profilePicture: "",
          profilePictureFileName: "",
          linkedInUrl: "",
          portfolioUrl: "",
          skills: [],
          interestedFields: [],
          communicationPreferences: [],
          languages: ["English"],
        }),
      );
    });
  });

  // ── getMyProfile ────────────────────────────────────────────────────────
  describe("getMyProfile", () => {
    test("returns mapped profile when found", async () => {
      mockRepo.findByUserIdWithAccountInfo.mockResolvedValue(mockProfile);

      const result = await service.getMyProfile("u1");

      expect(mockRepo.findByUserIdWithAccountInfo).toHaveBeenCalledWith("u1");
      expect(result).toBe(mockProfile);
    });

    test("throws 404 when profile not found", async () => {
      mockRepo.findByUserIdWithAccountInfo.mockResolvedValue(null);

      await expect(service.getMyProfile("u1")).rejects.toMatchObject({
        statusCode: 404,
        message: "Profile not found",
      });
    });
  });

  // ── updateMyProfile ─────────────────────────────────────────────────────
  describe("updateMyProfile", () => {
    test("returns updated profile when found", async () => {
      mockRepo.findOneAndUpdateByUserId.mockResolvedValue(mockProfile);

      const result = await service.updateMyProfile("u1", { bio: "Updated" });

      expect(mockRepo.findOneAndUpdateByUserId).toHaveBeenCalledWith("u1", {
        bio: "Updated",
      });
      expect(result).toBe(mockProfile);
    });

    test("throws 404 when profile not found", async () => {
      mockRepo.findOneAndUpdateByUserId.mockResolvedValue(null);

      await expect(service.updateMyProfile("u1", {})).rejects.toMatchObject({
        statusCode: 404,
        message: "Profile not found",
      });
    });
  });

  // ── getPublicProfile ────────────────────────────────────────────────────
  describe("getPublicProfile", () => {
    test("returns public profile when found", async () => {
      mockRepo.findPublishedByUserId.mockResolvedValue(mockProfile);

      const result = await service.getPublicProfile("u1");

      expect(mockRepo.findPublishedByUserId).toHaveBeenCalledWith("u1");
      expect(result).toBe(mockProfile);
    });

    test("throws 404 when profile not found", async () => {
      mockRepo.findPublishedByUserId.mockResolvedValue(null);

      await expect(service.getPublicProfile("u1")).rejects.toMatchObject({
        statusCode: 404,
        message: "Mentee profile not found",
      });
    });
  });
});
