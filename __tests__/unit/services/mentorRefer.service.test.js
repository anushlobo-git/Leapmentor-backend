/**
 * @fileoverview Mentor Referral Service Unit Tests
 */

const createMentorReferService = require("../../../services/mentorRefer.service");

jest.mock("../../../mappers/mentorProfile.mapper", () => ({
  toMentorProfileDTO: jest.fn((profile) => ({
    isProfileDTO: true,
    ...profile,
  })),
}));

describe("Mentor Referral Service", () => {
  let mockConnectRepo, mockMentorRepo, service;

  beforeEach(() => {
    mockConnectRepo = { findByIdWithMentorId: jest.fn() };
    mockMentorRepo = {
      findMentorProfileByUserId: jest.fn(),
      findSimilarPublishedMentors: jest.fn(),
    };

    service = createMentorReferService({
      connectRequestRepository: mockConnectRepo,
      mentorProfileRepository: mockMentorRepo,
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe("getSimilarMentorsList", () => {
    test("throws 404 if connection request not found", async () => {
      mockConnectRepo.findByIdWithMentorId.mockResolvedValue(null);

      await expect(
        service.getSimilarMentorsList("missing_req", "mentor_id"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Request not found",
      });
    });

    test("throws 403 if caller is not the assigned mentor", async () => {
      mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
        mentor: "mentor_abc",
      });

      await expect(
        service.getSimilarMentorsList("req_id", "other_user"),
      ).rejects.toMatchObject({
        statusCode: 403,
        message:
          "Not authorized to look up alternatives for this connection contract",
      });
    });

    test("returns empty result early when mentor profile has no skills", async () => {
      mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
        mentor: "mentor_123",
      });
      mockMentorRepo.findMentorProfileByUserId.mockResolvedValue({
        skills: [],
      });

      const result = await service.getSimilarMentorsList(
        "req_id",
        "mentor_123",
      );

      expect(mockMentorRepo.findSimilarPublishedMentors).not.toHaveBeenCalled();
      expect(result).toEqual({ mentors: [], mySkills: [] });
    });

    test("returns empty result early when mentor profile is null", async () => {
      mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
        mentor: "mentor_123",
      });
      mockMentorRepo.findMentorProfileByUserId.mockResolvedValue(null);

      const result = await service.getSimilarMentorsList(
        "req_id",
        "mentor_123",
      );

      expect(mockMentorRepo.findSimilarPublishedMentors).not.toHaveBeenCalled();
      expect(result).toEqual({ mentors: [], mySkills: [] });
    });

    test("ranks candidates by skill match count in descending order", async () => {
      mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
        mentor: "mentor_123",
      });
      mockMentorRepo.findMentorProfileByUserId.mockResolvedValue({
        skills: ["Node.js", "GraphQL", "Docker"],
      });
      mockMentorRepo.findSimilarPublishedMentors.mockResolvedValue([
        { user: "m_low", skills: ["Node.js"] },
        { user: "m_high", skills: ["GraphQL", "Node.js", "Docker", "AWS"] },
      ]);

      const result = await service.getSimilarMentorsList(
        "req_xyz",
        "mentor_123",
      );

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

      expect(result.mentors[0].user).toBe("m_high");
      expect(result.mentors[0].matchCount).toBe(3);
      expect(result.mentors[1].user).toBe("m_low");
      expect(result.mentors[1].matchCount).toBe(1);
      expect(result.mySkills).toEqual(["Node.js", "GraphQL", "Docker"]);
    });

    test("match count is case-insensitive", async () => {
      mockConnectRepo.findByIdWithMentorId.mockResolvedValue({
        mentor: "mentor_123",
      });
      mockMentorRepo.findMentorProfileByUserId.mockResolvedValue({
        skills: ["node.js", "graphql"],
      });
      mockMentorRepo.findSimilarPublishedMentors.mockResolvedValue([
        { user: "m1", skills: ["NODE.JS", "GRAPHQL"] },
      ]);

      const result = await service.getSimilarMentorsList(
        "req_id",
        "mentor_123",
      );

      expect(result.mentors[0].matchCount).toBe(2);
    });
  });
});
