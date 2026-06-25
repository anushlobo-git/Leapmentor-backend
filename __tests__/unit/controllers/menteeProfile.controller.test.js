const createMenteeProfileController = require("../../../controllers/menteeProfile.controller");

describe("Mentee Profile Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = { createProfile: jest.fn(), getMyProfile: jest.fn(), updateMyProfile: jest.fn(), getPublicProfile: jest.fn() };
    controller = createMenteeProfileController(mockService);
    mockReq = { user: { _id: "u1" }, body: {}, params: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("createProfile should compile records with 201 Created headers", async () => {
    mockReq.body = { currentRole: "Software Engineer" };
    mockService.createProfile.mockResolvedValue({ _id: "profile_101" });

    await controller.createProfile(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});