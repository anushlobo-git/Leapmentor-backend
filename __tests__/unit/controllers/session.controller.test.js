/**
 * @fileoverview Session Controller Unit Tests
 */

const createSessionController = require("../../../controllers/session.controller");

describe("Session Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      getSlots: jest.fn(),
      setMeetingLink: jest.fn(),
      markSlotComplete: jest.fn(),
      addSlot: jest.fn(),
      cancelSlot: jest.fn(),
      rescheduleSlot: jest.fn(),
      getMentorAvailability: jest.fn(),
    };
    controller = createSessionController({ sessionService: mockService });
    mockReq = {
      user: { _id: "user_id" },
      params: { connectRequestId: "conn_id", slotIndex: "0" },
      body: {},
      query: {},
    };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  test("getSlots should return 200 with slots data", async () => {
    mockService.getSlots.mockResolvedValue({ slots: [] });
    await controller.getSlots(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getSlots).toHaveBeenCalledWith("conn_id", "user_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, slots: [] });
  });

  test("getSlots should route error to next()", async () => {
    mockService.getSlots.mockRejectedValue(new Error("Failed"));
    await controller.getSlots(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("setMeetingLink should return 200 with updated link", async () => {
    mockReq.body.meetingLink = "https://meet.example.com/abc";
    mockService.setMeetingLink.mockResolvedValue({ slot: { meetingLink: "https://meet.example.com/abc" } });

    await controller.setMeetingLink(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.setMeetingLink).toHaveBeenCalledWith({
      connectRequestId: "conn_id",
      slotIndex: "0",
      meetingLink: "https://meet.example.com/abc",
      userId: "user_id",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Meeting link updated" }));
  });

  test("setMeetingLink should route error to next()", async () => {
    mockService.setMeetingLink.mockRejectedValue(new Error("Failed"));
    await controller.setMeetingLink(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("markSlotComplete should return 200 with result", async () => {
    mockService.markSlotComplete.mockResolvedValue({ slot: { status: "completed" } });

    await controller.markSlotComplete(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.markSlotComplete).toHaveBeenCalledWith({
      connectRequestId: "conn_id",
      slotIndex: "0",
      userId: "user_id",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test("markSlotComplete should route error to next()", async () => {
    mockService.markSlotComplete.mockRejectedValue(new Error("Failed"));
    await controller.markSlotComplete(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("addSlot should return 201 with new slot", async () => {
    mockReq.body = { date: "2026-07-01", startTime: "10:00", endTime: "11:00" };
    mockService.addSlot.mockResolvedValue({ slot: { date: "2026-07-01" } });

    await controller.addSlot(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.addSlot).toHaveBeenCalledWith({
      connectRequestId: "conn_id",
      date: "2026-07-01",
      startTime: "10:00",
      endTime: "11:00",
      userId: "user_id",
    });
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Additional session slot added successfully" }));
  });

  test("addSlot should route error to next()", async () => {
    mockService.addSlot.mockRejectedValue(new Error("Failed"));
    await controller.addSlot(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("cancelSlot should return 200 with cancelled slot", async () => {
    mockReq.body = { reason: "Schedule conflict" };
    mockService.cancelSlot.mockResolvedValue({ slot: { status: "cancelled" } });

    await controller.cancelSlot(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.cancelSlot).toHaveBeenCalledWith({
      connectRequestId: "conn_id",
      slotIndex: "0",
      reason: "Schedule conflict",
      userId: "user_id",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Slot cancelled successfully" }));
  });

  test("cancelSlot should route error to next()", async () => {
    mockService.cancelSlot.mockRejectedValue(new Error("Failed"));
    await controller.cancelSlot(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("rescheduleSlot should return 200 with rescheduled slot", async () => {
    mockReq.body = { date: "2026-07-10", startTime: "14:00", endTime: "15:00" };
    mockService.rescheduleSlot.mockResolvedValue({ slot: { date: "2026-07-10" } });

    await controller.rescheduleSlot(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.rescheduleSlot).toHaveBeenCalledWith({
      connectRequestId: "conn_id",
      slotIndex: "0",
      date: "2026-07-10",
      startTime: "14:00",
      endTime: "15:00",
      userId: "user_id",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Slot rescheduled successfully" }));
  });

  test("rescheduleSlot should route error to next()", async () => {
    mockService.rescheduleSlot.mockRejectedValue(new Error("Failed"));
    await controller.rescheduleSlot(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });

  test("getMentorAvailability should return 200 with available slots using default duration 60", async () => {
    mockReq.query = {}; // no duration
    mockService.getMentorAvailability.mockResolvedValue({ available: [] });

    await controller.getMentorAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getMentorAvailability).toHaveBeenCalledWith("conn_id", 60, "user_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, available: [] });
  });

  test("getMentorAvailability should use custom duration from query", async () => {
    mockReq.query = { duration: "30" };
    mockService.getMentorAvailability.mockResolvedValue({ available: [] });

    await controller.getMentorAvailability(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getMentorAvailability).toHaveBeenCalledWith("conn_id", 30, "user_id");
  });

  test("getMentorAvailability should route error to next()", async () => {
    mockService.getMentorAvailability.mockRejectedValue(new Error("Failed"));
    await controller.getMentorAvailability(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalled();
  });
});
