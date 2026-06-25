/**
 * @fileoverview Mentor Profile Transport Controller Unit Tests
 * @description Evaluates JSON tracking format signatures, network states, and async exception routing maps.
 */

const createMentorProfileController = require("../../../controllers/mentorProfile.controller");

describe("Mentor Profile Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      createProfile: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      getPublicProfile: jest.fn(),
    };

    controller = createMentorProfileController(mockService);

    mockReq = { user: { _id: "user_101" }, body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("createProfile should return the created layout with a 201 status header on valid inputs", async () => {
    mockReq.body = { currentRole: "Principal Engineer" };
    mockService.createProfile.mockResolvedValue({
      _id: "prof_01",
      currentRole: "Principal Engineer",
    });

    await controller.createProfile(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Mentor profile created successfully",
      profile: expect.objectContaining({ currentRole: "Principal Engineer" }),
    });
  });
});
