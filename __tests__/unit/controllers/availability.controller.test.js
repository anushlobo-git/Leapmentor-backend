/**
 * @fileoverview Mentor Availability Controller Unit Tests
 * @description Validates structural HTTP status code returns, fallback parsing loops,
 * query string parameters extraction, and boundary catch-all exception routing.
 */

const createAvailabilityController = require("../../../controllers/availability.controller");

describe("Mentor Availability Controller Unit Tests", () => {
  let mockAvailabilityService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockAvailabilityService = {
      getMyAvailability: jest.fn(),
      createAvailability: jest.fn(),
      updateAvailability: jest.fn(),
      getMentorAvailability: jest.fn(),
      deleteAvailability: jest.fn(),
      getAvailableSlots: jest.fn(),
    };

    controller = createAvailabilityController(mockAvailabilityService);

    mockReq = {
      user: { _id: "mentor_uuid_101" },
      body: {},
      params: {},
      query: {},
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

  test("getMyAvailability should return a 200 status code and serialize the target settings", async () => {
    const mockData = { timezone: "Asia/Kolkata", sessionDurations: [30] };
    mockAvailabilityService.getMyAvailability.mockResolvedValue(mockData);

    await controller.getMyAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockAvailabilityService.getMyAvailability).toHaveBeenCalledWith(
      "mentor_uuid_101",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(mockData);
  });

  test("createAvailability should return a 201 status code and confirm record initialization", async () => {
    mockReq.body = { timezone: "UTC" };
    mockAvailabilityService.createAvailability.mockResolvedValue({
      _id: "new_record",
    });

    await controller.createAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Availability created successfully",
      availability: { _id: "new_record" },
    });
  });

  test("updateAvailability should return a 200 status code on successful patches", async () => {
    mockReq.body = { sessionDurations: [45] };
    mockAvailabilityService.updateAvailability.mockResolvedValue({
      _id: "updated_record",
    });

    await controller.updateAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Availability updated successfully",
      availability: { _id: "updated_record" },
    });
  });

  test("getMentorAvailability should return public metadata arrays matching specific param criteria", async () => {
    mockReq.params.mentorId = "target_id";
    mockAvailabilityService.getMentorAvailability.mockResolvedValue({
      timezone: "UTC",
    });

    await controller.getMentorAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockAvailabilityService.getMentorAvailability).toHaveBeenCalledWith(
      "target_id",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ timezone: "UTC" });
  });

  test("deleteAvailability should execute cleanup tasks and broadcast completion logs", async () => {
    await controller.deleteAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockAvailabilityService.deleteAvailability).toHaveBeenCalledWith(
      "mentor_uuid_101",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Availability cleared successfully",
    });
  });

  test("getAvailableSlots should substitute default durations if the client's query string is unallocated", async () => {
    mockReq.params.mentorId = "mentor_id_55";
    mockReq.query.duration = undefined; // Trigger fallback
    mockAvailabilityService.getAvailableSlots.mockResolvedValue({ slots: [] });

    await controller.getAvailableSlots(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockAvailabilityService.getAvailableSlots).toHaveBeenCalledWith(
      "mentor_id_55",
      60,
      "mentor_uuid_101",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test("should catch thrown runtime validation failures and route them downstream to next()", async () => {
    const mockException = new Error("Availability not set by this mentor");
    mockAvailabilityService.getMentorAvailability.mockRejectedValue(
      mockException,
    );
    mockReq.params.mentorId = "missing_mentor";

    await controller.getMentorAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockException);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
