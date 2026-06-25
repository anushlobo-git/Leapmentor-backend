/**
 * @fileoverview Admin Mentor Verification Controller Caching Unit Tests
 */

const createAdminVerificationController = require("../../../controllers/admin-verification.controller");

describe("Admin Verification Controller Interceptors", () => {
  let mockService, mockCache, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      getAllMentorVerificationsService: jest.fn(),
      verifyMentorService: jest.fn(),
    };
    mockCache = {
      getOrSetCache: jest
        .fn()
        .mockImplementation(async (key, ttl, fetchFn) => await fetchFn()),
      evictCache: jest.fn(),
    };
    controller = createAdminVerificationController(mockService, mockCache);
    mockReq = { params: {}, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("getAllMentorVerifications should pull data from cache handlers predictably", async () => {
    mockService.getAllMentorVerificationsService.mockResolvedValue([]);
    await controller.getAllMentorVerifications(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCache.getOrSetCache).toHaveBeenCalledWith(
      "admin:verifications:master-list",
      300,
      expect.any(Function),
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test("verifyMentor should issue multi-key cache evictions immediately during mutations", async () => {
    mockReq.params.mentorProfileId = "prof777";
    mockService.verifyMentorService.mockResolvedValue({
      mentorName: "Bob",
      mentorProfileId: "prof777",
      verificationStatus: "verified",
    });

    await controller.verifyMentor(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockCache.getOrSetCache).not.toHaveBeenCalled();
    expect(mockCache.evictCache).toHaveBeenCalledWith(
      "admin:verifications:master-list",
    );
    expect(mockCache.evictCache).toHaveBeenCalledWith(
      "admin:verifications:profile-detail:prof777",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});

