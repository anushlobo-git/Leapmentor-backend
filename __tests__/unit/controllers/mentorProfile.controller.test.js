/**
 * @fileoverview Mentor Profile Transport Controller Unit Tests
 * @description Evaluates JSON tracking format signatures, network states, and async exception routing maps.
 */

const createMentorProfileController = require("../../../controllers/mentorProfile.controller");
const { successEnvelope } = require("../../helpers/apiResponse");

describe("Mentor Profile Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      createProfile: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      getPublicProfile: jest.fn(),
    };

    controller = createMentorProfileController({
      mentorProfileService: mockService,
    });

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

    expect(mockService.createProfile).toHaveBeenCalledWith(
      "user_101",
      mockReq.body,
    );
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          profile: expect.objectContaining({
            currentRole: "Principal Engineer",
          }),
        },
        "Mentor profile created successfully",
      ),
    );
  });

  test("createProfile should route exception to next()", async () => {
    const error = new Error("Failed to create profile");
    mockService.createProfile.mockRejectedValue(error);

    await controller.createProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("getMyProfile should return 200 with profile payload", async () => {
    mockService.getMyProfile.mockResolvedValue({ _id: "prof_01" });

    await controller.getMyProfile(mockReq, mockRes, mockNext);

    expect(mockService.getMyProfile).toHaveBeenCalledWith("user_101");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope({ _id: "prof_01" }, "Mentor profile retrieved"),
    );
  });

  test("getMyProfile should route exception to next()", async () => {
    const error = new Error("Failed to get profile");
    mockService.getMyProfile.mockRejectedValue(error);

    await controller.getMyProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("updateProfile should return 200 with updated profile", async () => {
    mockReq.body = { currentRole: "Distinguished Engineer" };
    mockService.updateMyProfile.mockResolvedValue({
      _id: "prof_01",
      currentRole: "Distinguished Engineer",
    });

    await controller.updateProfile(mockReq, mockRes, mockNext);

    expect(mockService.updateMyProfile).toHaveBeenCalledWith(
      "user_101",
      mockReq.body,
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope(
        {
          profile: expect.objectContaining({
            currentRole: "Distinguished Engineer",
          }),
        },
        "Profile updated successfully",
      ),
    );
  });

  test("updateProfile should route exception to next()", async () => {
    const error = new Error("Failed to update profile");
    mockService.updateMyProfile.mockRejectedValue(error);

    await controller.updateProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("getPublicProfile should return 200 with public profile", async () => {
    mockReq.params.id = "target_mentor_id";
    mockService.getPublicProfile.mockResolvedValue({ name: "Bob" });

    await controller.getPublicProfile(mockReq, mockRes, mockNext);

    expect(mockService.getPublicProfile).toHaveBeenCalledWith(
      "target_mentor_id",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      successEnvelope({ name: "Bob" }, "Mentor profile retrieved"),
    );
  });

  test("getPublicProfile should route exception to next()", async () => {
    const error = new Error("Failed to get public profile");
    mockService.getPublicProfile.mockRejectedValue(error);

    await controller.getPublicProfile(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
