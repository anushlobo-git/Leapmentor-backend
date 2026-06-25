/**
 * @fileoverview Mentor Referral Service Unit Tests
 * @description Validates skill intersection math, candidate rank sorting,
 * and operational access guard checks with isolated driver stubs.
 */

const createMentorReferService = require("../../../services/mentorRefer.service");
const AppError = require("../../../utils/AppError");

jest.mock("../../../mappers/mentorProfile.mapper", () => ({
  toMentorProfileDTO: jest.fn((profile) => ({
    isProfileDTO: true,
    ...profile,
  })),
}));

describe("Mentor Referral Service Unit Tests", () => {
  let mockConnectRepo, mockMentorRepo, service;

  beforeEach(() => {
    mockConnectRepo = {
      findByIdWithMentorId: jest.fn(),
    };
    mockMentorRepo = {
      findMentorProfileByUserId: jest.fn(),
      findSimilarPublishedMentors: jest.fn(),
    };

    service = createMentorReferService(mockConnectRepo, mockMentorRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should successfully calculate skill match overlaps and sort candidates by ranked descending score", async () => {
    mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
      mentor: "mentor_123",
    });
    mockMentorRepo.findMentorProfileByUserId.mockResolvedValue({
      skills: ["Node.js", "GraphQL", "Docker"],
    });

    const unrankedCandidates = [
      { user: "m_low", skills: ["Node.js"] },
      { user: "m_high", skills: ["GraphQL", "Node.js", "Docker", "AWS"] },
    ];
    mockMentorRepo.findSimilarPublishedMentors.mockResolvedValue(
      unrankedCandidates,
    );

    const result = await service.getSimilarMentorsList("req_xyz", "mentor_123");

    expect(mockConnectRepo.findByIdWithMentorId).toHaveBeenCalledWith(
      "req_xyz",
    );
    expect(mockMentorRepo.findMentorProfileByUserId).toHaveBeenCalledWith(
      "mentor_123",
    );
    expect(mockMentorRepo.findSimilarPublishedMentors).toHaveBeenCalledWith(
      "mentor_123",
      ["Node.js", "GraphQL", "Docker"],
      20,
    );

    // Verify high-matching candidate sorted to index 0
    expect(result.mentors[0].user).toBe("m_high");
    expect(result.mentors[0].matchCount).toBe(3);

    // Verify lower-matching candidate sorted down to index 1
    expect(result.mentors[1].user).toBe("m_low");
    expect(result.mentors[1].matchCount).toBe(1);

    expect(result.mySkills).toEqual(["Node.js", "GraphQL", "Docker"]);
  });

  test("should throw a 404 status exception if the targeted connection request record does not exist", async () => {
    mockConnectRepo.findByIdWithMentorId.mockResolvedValue(null);

    await expect(
      service.getSimilarMentorsList("missing_req", "mentor_id"),
    ).rejects.toThrow(new AppError("Request not found", 404));
  });

  test("should throw a 403 Forbidden exception if the calling user is not the assigned recipient of the request", async () => {
    mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
      mentor: "mentor_assigned_abc",
    });

    await expect(
      service.getSimilarMentorsList("req_id", "malicious_caller_id"),
    ).rejects.toThrow(
      new AppError(
        "Not authorized to look up alternatives for this connection contract",
        403,
      ),
    );
  });

  test("should gracefully return empty arrays early if the requesting user's profile lists zero skill elements", async () => {
    mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
      mentor: "mentor_123",
    });
    mockMentorRepo.findMentorProfileByUserId.mockResolvedValue({ skills: [] });

    const result = await service.getSimilarMentorsList("req_id", "mentor_123");

    expect(mockMentorRepo.findSimilarPublishedMentors).not.toHaveBeenCalled();
    expect(result).toEqual({ mentors: [], mySkills: [] });
  });
});
