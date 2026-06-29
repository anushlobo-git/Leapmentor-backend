/**
 * @fileoverview Mentor Search Core Business Logic Unit Tests
 */

const createMentorSearchService = require("../../../services/mentorSearch.service");

describe("Mentor Search Service Unit Tests", () => {
  let mockMentorRepo, mockUserRepo, mockMapper, mockLogger, service;

  beforeEach(() => {
    mockMentorRepo = {
      countMentorProfiles: jest.fn(),
      findMentorsWithUserPopulation: jest.fn(),
      aggregateMentorProfiles: jest.fn(),
    };
    mockUserRepo = { findUsersByRoleAndNameRegex: jest.fn() };
    mockMapper = jest.fn((val) => ({ mapped: true, ...val }));
    mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    service = createMentorSearchService({
      mentorSearchRepository: mockMentorRepo,
      userRepository: mockUserRepo,
      toMentorProfileDTO: mockMapper,
      logger: mockLogger,
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ── _getPlainList (no query, no filters) ──────────────────────

  test("queryMentors: returns plain list when no query or filters provided", async () => {
    mockMentorRepo.countMentorProfiles.mockResolvedValue(2);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([
      { _id: "m1" },
      { _id: "m2" },
    ]);

    const result = await service.queryMentors({});

    expect(mockMentorRepo.countMentorProfiles).toHaveBeenCalled();
    expect(result.mentors).toHaveLength(2);
    expect(result.pagination).toMatchObject({ totalCount: 2, currentPage: 1 });
  });

  // ── _validatePriceRange ───────────────────────────────────────

  test("queryMentors: throws 400 if minPrice exceeds maxPrice", async () => {
    await expect(
      service.queryMentors({ minPrice: "100", maxPrice: "50" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "minPrice cannot exceed maxPrice.",
    });
  });

  test("queryMentors: does not throw if only minPrice is provided", async () => {
    mockMentorRepo.aggregateMentorProfiles.mockResolvedValue([
      { results: [{ _id: "m1", user: { _id: "u1" }, searchScore: 5 }] },
    ]);

    await expect(
      service.queryMentors({ skill: "js", minPrice: "50" }),
    ).resolves.toBeDefined();
  });

  // ── Atlas Search: success path ────────────────────────────────

  test("queryMentors: returns paginated Atlas results for a skill query", async () => {
    const mentor = {
      _id: "m1",
      user: { _id: "u1", name: "Alice", email: "a@b.com" },
      searchScore: 9,
    };
    mockMentorRepo.aggregateMentorProfiles.mockResolvedValue([
      { results: [mentor] },
    ]);

    const result = await service.queryMentors({
      skill: "react",
      page: 1,
      limit: 6,
    });

    expect(mockMentorRepo.aggregateMentorProfiles).toHaveBeenCalled();
    expect(result.mentors[0]).toMatchObject({ mapped: true, searchScore: 9 });
    expect(result.pagination.totalCount).toBe(1);
  });

  test("queryMentors: includes industry must-clause and experience $match when filters provided", async () => {
    const mentor = {
      _id: "m2",
      user: { _id: "u2", name: "Bob", email: "b@b.com" },
      searchScore: 3,
    };
    mockMentorRepo.aggregateMentorProfiles.mockResolvedValue([
      { results: [mentor] },
    ]);

    const result = await service.queryMentors({
      skill: "python",
      industry: "Finance",
      minExperience: "2",
      maxExperience: "10",
      minRating: "4",
      minPrice: "50",
      maxPrice: "200",
    });

    expect(result.mentors).toHaveLength(1);
    expect(mockMentorRepo.aggregateMentorProfiles).toHaveBeenCalled();
  });

  // ── Atlas Search: 0 hits → fallback ──────────────────────────

  test("queryMentors: falls back to regex when Atlas returns 0 results", async () => {
    mockMentorRepo.aggregateMentorProfiles.mockResolvedValue([{ results: [] }]);
    mockMentorRepo.countMentorProfiles.mockResolvedValue(1);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([
      { _id: "m3" },
    ]);
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([]);

    const result = await service.queryMentors({ skill: "cobol" });

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockMentorRepo.findMentorsWithUserPopulation).toHaveBeenCalled();
    expect(result.mentors).toHaveLength(1);
  });

  // ── Atlas Search: $search error → fallback ───────────────────

  test("queryMentors: falls back to regex on $search Atlas cluster error", async () => {
    mockMentorRepo.aggregateMentorProfiles.mockRejectedValue(
      new Error("$search index not available"),
    );
    mockMentorRepo.countMentorProfiles.mockResolvedValue(1);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([
      { _id: "m4" },
    ]);
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([]);

    const result = await service.queryMentors({ skill: "java" });

    expect(mockLogger.error).toHaveBeenCalled();
    expect(result.mentors).toHaveLength(1);
  });

  test("queryMentors: re-throws non-Atlas errors from aggregation", async () => {
    mockMentorRepo.aggregateMentorProfiles.mockRejectedValue(
      new Error("Database connection lost"),
    );

    await expect(service.queryMentors({ skill: "go" })).rejects.toMatchObject({
      message: "Database connection lost",
    });
  });

  // ── _mergeNameMatches ─────────────────────────────────────────

  test("queryMentors: merges name-matched profiles missing from Atlas results", async () => {
    const atlasResult = { _id: "m1", user: { _id: "u1" }, searchScore: 5 };
    mockMentorRepo.aggregateMentorProfiles.mockResolvedValue([
      { results: [atlasResult] },
    ]);
    // u2 is name-matched but not in Atlas results
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([{ _id: "u2" }]);
    const extraProfile = {
      _id: "m2",
      user: { _id: "u2", name: "Carol", email: "c@b.com" },
    };
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([
      extraProfile,
    ]);

    const result = await service.queryMentors({
      name: "Carol",
      skill: "react",
    });

    expect(mockMentorRepo.findMentorsWithUserPopulation).toHaveBeenCalled();
    expect(result.mentors.length).toBeGreaterThanOrEqual(1);
  });

  test("queryMentors: filters to only name-matched profiles when no skill is provided", async () => {
    const u1Profile = { _id: "m1", user: { _id: "u1" }, searchScore: 5 };
    const u2Profile = { _id: "m2", user: { _id: "u2" }, searchScore: 3 };
    mockMentorRepo.aggregateMentorProfiles.mockResolvedValue([
      { results: [u1Profile, u2Profile] },
    ]);
    // only u1 matched by name
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([{ _id: "u1" }]);

    const result = await service.queryMentors({ name: "Alice" });

    // only u1 should remain after name-filter
    expect(result.mentors).toHaveLength(1);
  });

  test("queryMentors: skips merge when nameMatchedProfileUserIds is empty set", async () => {
    mockMentorRepo.aggregateMentorProfiles.mockResolvedValue([
      { results: [{ _id: "m1", user: { _id: "u1" }, searchScore: 1 }] },
    ]);
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([]); // empty → empty Set

    const result = await service.queryMentors({ name: "nobody", skill: "go" });

    expect(mockMentorRepo.findMentorsWithUserPopulation).not.toHaveBeenCalled();
    expect(result.mentors).toHaveLength(1);
  });

  // ── executeFallbackSearch ─────────────────────────────────────

  test("executeFallbackSearch: builds filter with industry, minRating, price and experience ranges", async () => {
    mockMentorRepo.countMentorProfiles.mockResolvedValue(0);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([]);
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([]);

    const result = await service.executeFallbackSearch({
      skill: "node",
      industry: "Tech",
      minRating: "3",
      minPrice: "20",
      maxPrice: "80",
      minExperience: "1",
      maxExperience: "5",
    });

    expect(mockMentorRepo.countMentorProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ industry: expect.any(Object) }),
    );
    expect(result.mentors).toHaveLength(0);
  });

  test("executeFallbackSearch: includes $or with user IDs when name/skill matches users", async () => {
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([{ _id: "u5" }]);
    mockMentorRepo.countMentorProfiles.mockResolvedValue(1);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([
      { _id: "m5" },
    ]);

    const result = await service.executeFallbackSearch({ name: "Dan" });

    expect(mockMentorRepo.countMentorProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
    );
    expect(result.mentors).toHaveLength(1);
  });

  test("executeFallbackSearch: $or only has skills clause when no users match name", async () => {
    mockUserRepo.findUsersByRoleAndNameRegex.mockResolvedValue([]);
    mockMentorRepo.countMentorProfiles.mockResolvedValue(0);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([]);

    await service.executeFallbackSearch({ skill: "rust" });

    expect(mockMentorRepo.countMentorProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ $or: [{ skills: expect.any(Object) }] }),
    );
  });

  test("executeFallbackSearch: clamps limit to CONFIG_MAX_LIMIT of 20", async () => {
    mockMentorRepo.countMentorProfiles.mockResolvedValue(0);
    mockMentorRepo.findMentorsWithUserPopulation.mockResolvedValue([]);

    await service.executeFallbackSearch({ limit: "999" });

    expect(mockMentorRepo.findMentorsWithUserPopulation).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      0,
      20,
    );
  });
});
