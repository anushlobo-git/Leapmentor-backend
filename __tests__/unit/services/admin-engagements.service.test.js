/**
 * @fileoverview Admin Engagements Service Corporate Unit Tests
 * @description Validates complex metrics calculations, pagination mathematics,
 * and user-filtering transformation workflows.
 */

const createAdminEngagementsService = require("../../../services/admin-engagements.service");

// Mock the mapper dependency to ensure complete isolation from layout rules
jest.mock("../../../mappers/connectRequest.mapper", () => ({
  toConnectRequestDTO: jest.fn((item) => ({ DTO: true, id: item._id })),
}));

describe("Admin Engagements Service", () => {
  let mockConnectRequestRepository;
  let mockUserRepository;
  let engagementsService;

  beforeEach(() => {
    mockConnectRequestRepository = {
      countByStatus: jest.fn(),
      countByFilter: jest.fn(),
      findEngagements: jest.fn(),
    };

    mockUserRepository = {
      findUsersBySearchTerm: jest.fn(),
    };

    engagementsService = createAdminEngagementsService(
      mockConnectRequestRepository,
      mockUserRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getEngagementStatsService ───────────────────────────────────────────
  describe("getEngagementStatsService", () => {
    test("should compile distinct status volumes into a single total summary", async () => {
      // Mock unique count values for each of the 6 core system statuses
      mockConnectRequestRepository.countByStatus
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(5) // accepted
        .mockResolvedValueOnce(2) // rejected
        .mockResolvedValueOnce(1) // referred
        .mockResolvedValueOnce(4) // ongoing
        .mockResolvedValueOnce(8); // completed

      const result = await engagementsService.getEngagementStatsService();

      expect(mockConnectRequestRepository.countByStatus).toHaveBeenCalledWith(
        "pending",
      );
      expect(mockConnectRequestRepository.countByStatus).toHaveBeenCalledWith(
        "completed",
      );
      expect(result).toEqual({
        pending: 10,
        accepted: 5,
        rejected: 2,
        referred: 1,
        ongoing: 4,
        completed: 8,
        total: 30, // 10 + 5 + 2 + 1 + 4 + 8
      });
    });

    test("should return zeroes across all properties if the collections are empty", async () => {
      mockConnectRequestRepository.countByStatus.mockResolvedValue(0);

      const result = await engagementsService.getEngagementStatsService();

      expect(result.total).toBe(0);
      expect(result.pending).toBe(0);
    });
  });

  // ── getEngagementsService ───────────────────────────────────────────────
  describe("getEngagementsService", () => {
    const mockEngagementList = [{ _id: "eng1" }, { _id: "eng2" }];

    test("should handle un-filtered baseline paginated query executions", async () => {
      mockConnectRequestRepository.countByFilter.mockResolvedValue(2);
      mockConnectRequestRepository.findEngagements.mockResolvedValue(
        mockEngagementList,
      );

      const result = await engagementsService.getEngagementsService({});

      expect(mockConnectRequestRepository.countByFilter).toHaveBeenCalledWith(
        {},
      );
      expect(mockConnectRequestRepository.findEngagements).toHaveBeenCalledWith(
        {},
        { skip: 0, limit: 15 },
      );
      expect(result.engagements).toEqual([
        { DTO: true, id: "eng1" },
        { DTO: true, id: "eng2" },
      ]);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 15,
        totalPages: 1,
      });
    });

    test("should inject compound date limits and apply 23:59:59 time extensions on upper bounds", async () => {
      mockConnectRequestRepository.countByFilter.mockResolvedValue(0);
      mockConnectRequestRepository.findEngagements.mockResolvedValue([]);

      await engagementsService.getEngagementsService({
        dateFrom: "2026-01-01",
        dateTo: "2026-01-05",
      });

      expect(mockConnectRequestRepository.countByFilter).toHaveBeenCalledWith({
        requestedAt: {
          $gte: new Date("2026-01-01"),
          $lte: new Date(new Date("2026-01-05").setHours(23, 59, 59, 999)),
        },
      });
    });

    test("should map matching user identifiers into $or statements when a search token is provided", async () => {
      const mockMatchingIds = [{ _id: "userA" }, { _id: "userB" }];
      mockUserRepository.findUsersBySearchTerm.mockResolvedValue(
        mockMatchingIds,
      );
      mockConnectRequestRepository.countByFilter.mockResolvedValue(1);
      mockConnectRequestRepository.findEngagements.mockResolvedValue([]);

      await engagementsService.getEngagementsService({ search: "Alice" });

      expect(mockUserRepository.findUsersBySearchTerm).toHaveBeenCalledWith(
        "Alice",
      );
      expect(mockConnectRequestRepository.countByFilter).toHaveBeenCalledWith({
        $or: [
          { mentor: { $in: ["userA", "userB"] } },
          { mentee: { $in: ["userA", "userB"] } },
        ],
      });
    });

    test("should bypass database aggregation matching queries if the search parameter evaluates to an empty string", async () => {
      mockConnectRequestRepository.countByFilter.mockResolvedValue(0);
      mockConnectRequestRepository.findEngagements.mockResolvedValue([]);

      await engagementsService.getEngagementsService({ search: "   " });

      expect(mockUserRepository.findUsersBySearchTerm).not.toHaveBeenCalled();
    });

    test("should compute correct skipped offsets when advanced page parameter indexes are passed", async () => {
      mockConnectRequestRepository.countByFilter.mockResolvedValue(50);
      mockConnectRequestRepository.findEngagements.mockResolvedValue([]);

      const result = await engagementsService.getEngagementsService({
        page: 3,
        limit: 10,
      });

      expect(mockConnectRequestRepository.findEngagements).toHaveBeenCalledWith(
        expect.any(Object),
        { skip: 20, limit: 10 }, // (Page 3 - 1) * 10 = 20 skipped entries
      );
      expect(result.pagination.totalPages).toBe(5);
    });
  });
});
