const createMentorSearchController = require("../../../controllers/mentorSearch.controller");

describe("Mentor Search Controller Unit Tests", () => {
  let mockSearchService,
    mockCacheUtility,
    controller,
    mockReq,
    mockRes,
    mockNext;

  beforeEach(() => {
    mockSearchService = { queryMentors: jest.fn() };
    mockCacheUtility = { getOrSetCache: jest.fn() };
    controller = createMentorSearchController(
      mockSearchService,
      mockCacheUtility,
    );

    mockReq = { query: {}, params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("should resolve deterministic sorted cache keys regardless of parameter ordering", async () => {
    mockReq.query = { skill: "node", page: "2" };
    mockCacheUtility.getOrSetCache.mockResolvedValue({ mentors: [] });

    await controller.searchMentors(mockReq, mockRes, mockNext);

    expect(mockCacheUtility.getOrSetCache).toHaveBeenCalledWith(
      "cache:mentors:page:2|skill:node",
      300,
      expect.any(Function),
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
