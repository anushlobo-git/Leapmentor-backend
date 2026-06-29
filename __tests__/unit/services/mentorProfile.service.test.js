/**
 * @fileoverview Mentor Profile Core Business Logic Unit Tests
 */

const createMentorProfileService = require("../../../services/mentorProfile.service");

describe("Mentor Profile Service Unit Tests", () => {
  let mockRepo, mockMapper, service;

  beforeEach(() => {
    mockRepo = {
      findMentorProfileByUserId: jest.fn(),
      create: jest.fn(),
      findMentorProfileByUserIdWithUser: jest.fn(),
      findOneAndUpdateByUserId: jest.fn(),
      findPublishedByUserId: jest.fn(),
    };
    mockMapper = jest.fn((val) => ({ mapped: true, ...val }));

    service = createMentorProfileService({
      mentorProfileRepository: mockRepo,
      toMentorProfileDTO: mockMapper,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── createProfile ──────────────────────────────────────────────

  test("createProfile: should throw 409 if profile already exists", async () => {
    mockRepo.findMentorProfileByUserId.mockResolvedValue({ _id: "p1" });

    await expect(
      service.createProfile("user_01", { currentRole: "CTO" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Profile already exists. Use update instead.",
    });
  });

  test("createProfile: should create and return mapped profile with explicit data", async () => {
    mockRepo.findMentorProfileByUserId.mockResolvedValue(null);
    const created = {
      user: "user_01",
      currentRole: "Engineer",
      skills: ["JS"],
    };
    mockRepo.create.mockResolvedValue(created);

    const result = await service.createProfile("user_01", {
      currentRole: "Engineer",
      industry: "Tech",
      company: "Acme",
      bio: "Hello",
      profilePicture: "pic.jpg",
      profilePictureFileName: "pic.jpg",
      yearsOfExperience: 5,
      hourlyRate: 100,
      skills: ["JS"],
      communicationPreferences: ["chat"],
      languages: ["French"],
      linkedInUrl: "https://li.com",
      portfolioUrl: "https://port.com",
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: "user_01",
        currentRole: "Engineer",
        yearsOfExperience: 5,
        hourlyRate: 100,
        languages: ["French"],
        isProfileComplete: true,
        isProfilePublished: true,
      }),
    );
    expect(mockMapper).toHaveBeenCalledWith(created);
    expect(result).toMatchObject({ mapped: true });
  });

  test("createProfile: should apply all default fallbacks when optional fields are absent", async () => {
    mockRepo.findMentorProfileByUserId.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({});

    await service.createProfile("user_02", { currentRole: "Dev" });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePicture: "",
        profilePictureFileName: "",
        yearsOfExperience: 0,
        hourlyRate: 0,
        skills: [],
        communicationPreferences: [],
        languages: ["English"],
        linkedInUrl: "",
        portfolioUrl: "",
      }),
    );
  });

  // ── getMyProfile ───────────────────────────────────────────────

  test("getMyProfile: should return mapped profile when found", async () => {
    const profile = { user: "user_03" };
    mockRepo.findMentorProfileByUserIdWithUser.mockResolvedValue(profile);

    const result = await service.getMyProfile("user_03");

    expect(mockMapper).toHaveBeenCalledWith(profile);
    expect(result).toMatchObject({ mapped: true });
  });

  test("getMyProfile: should throw 404 if profile not found", async () => {
    mockRepo.findMentorProfileByUserIdWithUser.mockResolvedValue(null);

    await expect(service.getMyProfile("ghost")).rejects.toMatchObject({
      statusCode: 404,
      message: "Profile not found",
    });
  });

  // ── updateMyProfile ────────────────────────────────────────────

  test("updateMyProfile: should return mapped profile after successful update", async () => {
    const updated = { user: "user_04", bio: "Updated" };
    mockRepo.findOneAndUpdateByUserId.mockResolvedValue(updated);

    const result = await service.updateMyProfile("user_04", { bio: "Updated" });

    expect(mockRepo.findOneAndUpdateByUserId).toHaveBeenCalledWith("user_04", {
      bio: "Updated",
    });
    expect(mockMapper).toHaveBeenCalledWith(updated);
    expect(result).toMatchObject({ mapped: true });
  });

  test("updateMyProfile: should throw 404 if profile not found", async () => {
    mockRepo.findOneAndUpdateByUserId.mockResolvedValue(null);

    await expect(
      service.updateMyProfile("ghost", { bio: "x" }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Profile not found",
    });
  });

  // ── getPublicProfile ───────────────────────────────────────────

  test("getPublicProfile: should return mapped public profile when found", async () => {
    const profile = { user: "user_05", isProfilePublished: true };
    mockRepo.findPublishedByUserId.mockResolvedValue(profile);

    const result = await service.getPublicProfile("user_05");

    expect(mockMapper).toHaveBeenCalledWith(profile);
    expect(result).toMatchObject({ mapped: true });
  });

  test("getPublicProfile: should throw 404 if published profile not found", async () => {
    mockRepo.findPublishedByUserId.mockResolvedValue(null);

    await expect(service.getPublicProfile("ghost")).rejects.toMatchObject({
      statusCode: 404,
      message: "Mentor profile not found",
    });
  });
});
