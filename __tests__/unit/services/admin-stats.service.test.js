/**
 * @fileoverview Admin Statistics Service Unit Tests
 * @description Validates aggregation processing loops, timeline map projections,
 * and high-volume parallel count matrices with zero network activity.
 */

const createAdminStatsService = require("../../../services/admin-stats.service");

describe("AdminStats Service", () => {
  let mockUserRepository;
  let mockMentorProfileRepository;
  let statsService;

  beforeEach(() => {
    mockUserRepository = {
      countUsersWithOptions: jest.fn(),
      getUserGrowth: jest.fn(),
    };

    mockMentorProfileRepository = {
      getMentorIndustryStats: jest.fn(),
    };

    // ✅ Correct instantiation — matches the destructured signature
    statsService = createAdminStatsService({
      userRepository: mockUserRepository,
      mentorProfileRepository: mockMentorProfileRepository,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getStatsService ─────────────────────────────────────────────────────
  describe("getStatsService", () => {
    test("should execute parallel query groups and unpack metric total counts correctly", async () => {
      mockUserRepository.countUsersWithOptions
        .mockResolvedValueOnce(500) // totalUsers
        .mockResolvedValueOnce(200) // totalMentors
        .mockResolvedValueOnce(300) // totalMentees
        .mockResolvedValueOnce(50) // newUsersThisMonth
        .mockResolvedValueOnce(20) // newMentorsThisMonth
        .mockResolvedValueOnce(30); // newMenteesThisMonth

      const result = await statsService.getStatsService();

      expect(mockUserRepository.countUsersWithOptions).toHaveBeenCalledTimes(6);
      expect(mockUserRepository.countUsersWithOptions).toHaveBeenCalledWith({});
      expect(mockUserRepository.countUsersWithOptions).toHaveBeenCalledWith({
        roles: "mentor",
      });
      expect(mockUserRepository.countUsersWithOptions).toHaveBeenCalledWith({
        createdAt: expect.objectContaining({ $gte: expect.any(Date) }),
      });
      expect(result).toEqual({
        totalUsers: 500,
        totalMentors: 200,
        totalMentees: 300,
        newUsersThisMonth: 50,
        newMentorsThisMonth: 20,
        newMenteesThisMonth: 30,
      });
    });

    test("should safely return zeros across all metric blocks if collections contain no user records", async () => {
      mockUserRepository.countUsersWithOptions.mockResolvedValue(0);

      const result = await statsService.getStatsService();

      expect(result.totalUsers).toBe(0);
      expect(result.newUsersThisMonth).toBe(0);
    });
  });

  // ── getUserGrowthService ────────────────────────────────────────────────
  describe("getUserGrowthService", () => {
    test("should correctly compute dynamic rolling lookback date ranges and transform timeline labels", async () => {
      const mockGrowthData = [
        { _id: "2026-03-15", count: 5 },
        { _id: "2026-04-20", count: 12 },
      ];
      mockUserRepository.getUserGrowth.mockResolvedValue(mockGrowthData);

      const result = await statsService.getUserGrowthService();

      expect(mockUserRepository.getUserGrowth).toHaveBeenCalledWith(
        expect.any(Date),
      );
      expect(result).toEqual([
        { label: "Mar 15", count: 5 },
        { label: "Apr 20", count: 12 },
      ]);
    });

    test("should map empty timeline sequences gracefully if lookback ranges hit zero values", async () => {
      mockUserRepository.getUserGrowth.mockResolvedValue([]);

      const result = await statsService.getUserGrowthService();

      expect(result).toEqual([]);
    });
  });

  // ── getMentorIndustryStatsService ───────────────────────────────────────
  describe("getMentorIndustryStatsService", () => {
    test("should transform raw sector aggregation objects into generic industry summary payloads", async () => {
      const mockAggResult = [
        { _id: "Tech", count: 85 },
        { _id: "Healthcare", count: 40 },
      ];
      mockMentorProfileRepository.getMentorIndustryStats.mockResolvedValue(
        mockAggResult,
      );

      const result = await statsService.getMentorIndustryStatsService();

      expect(
        mockMentorProfileRepository.getMentorIndustryStats,
      ).toHaveBeenCalled();
      expect(result).toEqual([
        { industry: "Tech", count: 85 },
        { industry: "Healthcare", count: 40 },
      ]);
    });

    test("should propagate internal database exceptions cleanly if retrieval crashes", async () => {
      mockMentorProfileRepository.getMentorIndustryStats.mockRejectedValue(
        new Error("Aggregation Capacity Exhausted"),
      );

      await expect(
        statsService.getMentorIndustryStatsService(),
      ).rejects.toThrow("Aggregation Capacity Exhausted");
    });
  });
});
