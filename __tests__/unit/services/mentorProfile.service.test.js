/**
 * @fileoverview Mentor Profile Core Business Logic Unit Tests
 * @description Evaluates validation boundaries, exception states, and payload mapping loops.
 */

const createMentorProfileService = require("../../../services/mentorProfile.service");
const AppError = require("../../../utils/AppError");

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
    mockMapper = jest.fn((val) => val);

    service = createMentorProfileService(mockRepo, mockMapper);
  });

  test("createProfile should throw a 409 error if a profile trace already exists", async () => {
    mockRepo.findMentorProfileByUserId.mockResolvedValue({
      _id: "profile_123",
    });

    await expect(
      service.createProfile("user_01", { currentRole: "CTO" }),
    ).rejects.toThrow(
      new AppError("Profile already exists. Use update instead.", 409),
    );
  });

  test("getMyProfile should throw a 404 error if records return empty", async () => {
    mockRepo.findMentorProfileByUserIdWithUser.mockResolvedValue(null);

    await expect(service.getMyProfile("user_ghost")).rejects.toThrow(
      new AppError("Profile not found", 404),
    );
  });
});
