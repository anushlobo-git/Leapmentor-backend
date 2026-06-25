/**
 * @fileoverview Mentor Referral Controller Unit Tests
 * @description Validates structural parameters mapping, JSON payload spreading accuracy,
 * HTTP status codes, and execution failure delegation.
 */

const createMentorReferController = require("../../../controllers/mentorRefer.controller");

describe("Mentor Referral Controller Unit Tests", () => {
  let mockMentorReferService, controller, mockReq, mockRes, mockNext;

  // Clear microtask loops to capture async operations wrapped in catchAsync
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockMentorReferService = {
      getSimilarMentorsList: jest.fn(),
    };

    controller = createMentorReferController(mockMentorReferService);

    mockReq = {
      user: { _id: "mentor_origin_uuid_101" },
      params: { id: "connect_request_uuid_999" },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return a 200 status code and flatten service results within the expected response shape", async () => {
    const mockServicePayload = {
      mySkills: ["Node.js", "MongoDB"],
      mentors: [{ name: "Peer Mentor", matchCount: 2 }],
    };
    mockMentorReferService.getSimilarMentorsList.mockResolvedValue(
      mockServicePayload,
    );

    await controller.getSimilarMentors(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockMentorReferService.getSimilarMentorsList).toHaveBeenCalledWith(
      "connect_request_uuid_999",
      "mentor_origin_uuid_101",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      mySkills: ["Node.js", "MongoDB"],
      mentors: [{ name: "Peer Mentor", matchCount: 2 }],
    });
  });

  test("should intercept thrown operational errors and route them directly down to next() middleware", async () => {
    const mockException = new Error(
      "Not authorized to look up alternatives for this connection contract",
    );
    mockMentorReferService.getSimilarMentorsList.mockRejectedValue(
      mockException,
    );

    await controller.getSimilarMentors(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockException);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
