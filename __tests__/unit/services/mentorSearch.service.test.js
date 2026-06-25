/**
 * @fileoverview Mentor Search Core Business Logic Unit Tests
 * @description Evaluates fallbacks, pagination limits, and price boundary exceptions.
 */

const createMentorSearchService = require("../../../services/mentorSearch.service");
const AppError = require("../../../utils/AppError");

describe("Mentor Search Service In-Memory Unit Tests", () => {
  let mockMentorRepo, mockUserRepo, mockMapper, mockLogger, service;

  beforeEach(() => {
    mockMentorRepo = {
      countMentorProfiles: jest.fn(),
      findMentorsWithUserPopulation: jest.fn(),
      aggregateMentorProfiles: jest.fn(),
    };
    mockUserRepo = { findUsersByRoleAndNameRegex: jest.fn() };
    mockMapper = jest.fn((val) => val);
    mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    service = createMentorSearchService(
      mockMentorRepo,
      mockUserRepo,
      mockMapper,
      mockLogger,
    );
  });

  test("queryMentors should throw an AppError if minPrice scales above maxPrice bounds", async () => {
    await expect(
      service.queryMentors({ minPrice: "100", maxPrice: "50" }),
    ).rejects.toThrow(new AppError("minPrice cannot exceed maxPrice.", 400));
  });

  test("queryMentors should trigger getPlainList when queries and filters are absent", async () => {
    mockMentorRepo.countMentorProfiles.mockResolvedValue(1);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([
      { _id: "m1" },
    ]);

    const result = await service.queryMentors({});
    expect(mockMentorRepo.countMentorProfiles).toHaveBeenCalled();
    expect(result.mentors).toHaveLength(1);
  });
});
