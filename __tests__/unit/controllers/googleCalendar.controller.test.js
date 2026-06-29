const createGoogleCalendarController = require("../../../controllers/googleCalendar.controller");

describe("Google Calendar Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      generateAuthUrl: jest.fn(),
      handleAuthCallback: jest.fn(),
      disconnectCalendar: jest.fn(),
      getBusySlots: jest.fn(),
      getCalendarEvents: jest.fn(),
    };

    controller = createGoogleCalendarController({ googleCalendarService: mockService });
    mockReq = { user: { _id: "user_123" }, query: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("getAuthUrl should pipe back redirection arrays with 200 statuses", async () => {
    mockService.generateAuthUrl.mockResolvedValue("https://redirect.url");
    await controller.getAuthUrl(mockReq, mockRes, mockNext);

    expect(mockService.generateAuthUrl).toHaveBeenCalledWith("user_123");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ url: "https://redirect.url" });
  });

  test("handleCallback should deliver JavaScript injection messaging blocks on error vectors in query", async () => {
    mockReq.query = { error: "access_denied" };
    await controller.handleCallback(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.stringContaining("GOOGLE_CALENDAR_ERROR"),
    );
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.stringContaining("access_denied"),
    );
  });

  test("handleCallback should deliver success JavaScript injection messaging blocks when callback succeeds", async () => {
    mockReq.query = { code: "auth_code", state: "auth_state" };
    mockService.handleAuthCallback.mockResolvedValue();

    await controller.handleCallback(mockReq, mockRes, mockNext);

    expect(mockService.handleAuthCallback).toHaveBeenCalledWith("auth_code", "auth_state");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.stringContaining("GOOGLE_CALENDAR_CONNECTED"),
    );
  });

  test("handleCallback should deliver error JavaScript injection messaging blocks when handleAuthCallback throws", async () => {
    mockReq.query = { code: "auth_code", state: "auth_state" };
    mockService.handleAuthCallback.mockRejectedValue(new Error("Token validation failed"));

    await controller.handleCallback(mockReq, mockRes, mockNext);

    expect(mockService.handleAuthCallback).toHaveBeenCalledWith("auth_code", "auth_state");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.stringContaining("GOOGLE_CALENDAR_ERROR"),
    );
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.stringContaining("Token%20validation%20failed"),
    );
  });

  test("disconnect should disconnect calendar and return 200", async () => {
    mockService.disconnectCalendar.mockResolvedValue();
    await controller.disconnect(mockReq, mockRes, mockNext);

    expect(mockService.disconnectCalendar).toHaveBeenCalledWith("user_123");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Google Calendar disconnected" });
  });

  test("getBusySlots should return busy slots and return 200", async () => {
    mockReq.query = { startDate: "2026-01-01", endDate: "2026-01-02" };
    const mockBusy = [{ start: "2026-01-01T10:00:00Z", end: "2026-01-01T11:00:00Z" }];
    mockService.getBusySlots.mockResolvedValue(mockBusy);

    await controller.getBusySlots(mockReq, mockRes, mockNext);

    expect(mockService.getBusySlots).toHaveBeenCalledWith({
      mentorId: "user_123",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ busy: mockBusy });
  });

  test("getEvents should return events and return 200", async () => {
    mockReq.query = { startDate: "2026-01-01", endDate: "2026-01-02" };
    const mockEvents = [{ id: "event1", summary: "Meeting" }];
    mockService.getCalendarEvents.mockResolvedValue(mockEvents);

    await controller.getEvents(mockReq, mockRes, mockNext);

    expect(mockService.getCalendarEvents).toHaveBeenCalledWith({
      mentorId: "user_123",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ events: mockEvents });
  });
});
