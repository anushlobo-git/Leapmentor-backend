const createMenteeProfileController = require("../../../controllers/menteeProfile.controller");

describe("Mentee Profile Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      createProfile: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      getPublicProfile: jest.fn(),
    };
    controller = createMenteeProfileController({ menteeProfileService: mockService });
    mockReq = { user: { _id: "u1" }, body: {}, params: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("createProfile should compile records with 201 Created headers", async () => {
    mockReq.body = { currentRole: "Software Engineer" };
    mockService.createProfile.mockResolvedValue({ _id: "profile_101" });

    await controller.createProfile(mockReq, mockRes, mockNext);
    expect(mockService.createProfile).toHaveBeenCalledWith("u1", mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Mentee profile created successfully",
      profile: { _id: "profile_101" },
    });
  });

  test("createProfile should route exception to next()", async () => {
    const error = new Error("Failed to create");
    mockService.createProfile.mockRejectedValue(error);

    await controller.createProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("getMyProfile should return 200 with profile payload", async () => {
    mockService.getMyProfile.mockResolvedValue({ _id: "profile_101" });

    await controller.getMyProfile(mockReq, mockRes, mockNext);
    expect(mockService.getMyProfile).toHaveBeenCalledWith("u1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ _id: "profile_101" });
  });

  test("getMyProfile should route exception to next()", async () => {
    const error = new Error("Failed to get profile");
    mockService.getMyProfile.mockRejectedValue(error);

    await controller.getMyProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("updateProfile should return 200 with updated profile", async () => {
    mockReq.body = { currentRole: "Senior Engineer" };
    mockService.updateMyProfile.mockResolvedValue({ _id: "profile_101", currentRole: "Senior Engineer" });

    await controller.updateProfile(mockReq, mockRes, mockNext);
    expect(mockService.updateMyProfile).toHaveBeenCalledWith("u1", mockReq.body);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Profile updated successfully",
      profile: { _id: "profile_101", currentRole: "Senior Engineer" },
    });
  });

  test("updateProfile should route exception to next()", async () => {
    const error = new Error("Failed to update");
    mockService.updateMyProfile.mockRejectedValue(error);

    await controller.updateProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("getPublicProfile should return 200 with public profile", async () => {
    mockReq.params.id = "target_user_id";
    mockService.getPublicProfile.mockResolvedValue({ name: "Alice" });

    await controller.getPublicProfile(mockReq, mockRes, mockNext);
    expect(mockService.getPublicProfile).toHaveBeenCalledWith("target_user_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ name: "Alice" });
  });

  test("getPublicProfile should route exception to next()", async () => {
    const error = new Error("Failed to get public profile");
    mockService.getPublicProfile.mockRejectedValue(error);

    await controller.getPublicProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});