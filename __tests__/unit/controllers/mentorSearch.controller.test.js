const createMentorSearchController = require("../../../controllers/mentorSearch.controller");

describe("Mentor Search Controller Unit Tests", () => {
  let mockSearchService,
    mockCacheUtility,
    controller,
    mockReq,
    mockRes,
    mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockSearchService = { queryMentors: jest.fn() };
    mockCacheUtility = { getOrSetCache: jest.fn() };
    controller = createMentorSearchController({
      mentorSearchService: mockSearchService,
      cacheUtility: mockCacheUtility,
    });

    mockReq = { query: {}, params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("should resolve deterministic sorted cache keys regardless of parameter ordering", async () => {
    mockReq.query = { skill: "node", page: "2", undefinedVal: undefined, emptyVal: "" };
    mockCacheUtility.getOrSetCache.mockImplementation(async (key, ttl, cb) => {
      // Execute the callback to cover the inner function as well
      return await cb();
    });
    mockSearchService.queryMentors.mockResolvedValue({ mentors: ["mentor1"] });

    await controller.searchMentors(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
      "cache:mentors:page:2|skill:node",
      300,
      expect.any(Function),
    );
    expect(mockSearchService.queryMentors).toHaveBeenCalledWith(mockReq.query);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      mentors: ["mentor1"],
    });
  });

  test("should handle empty query with default 'all' cache key", async () => {
    mockReq.query = {};
    mockCacheUtility.getOrSetCache.mockResolvedValue({ mentors: [] });

    await controller.searchMentors(mockReq, mockRes, mockNext);

    expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
      "cache:mentors:all",
      300,
      expect.any(Function),
    );
  });

  test("should route error to next() if service fails", async () => {
    mockReq.query = {};
    const mockError = new Error("Redis failure");
    mockCacheUtility.getOrSetCache.mockRejectedValue(mockError);

    await controller.searchMentors(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
