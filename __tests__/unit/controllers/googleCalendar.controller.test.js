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

    controller = createGoogleCalendarController(mockService);
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

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ url: "https://redirect.url" });
  });

  test("handleCallback should deliver JavaScript injection messaging blocks on error vectors", async () => {
    mockReq.query = { error: "access_denied" };
    await controller.handleCallback(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.stringContaining("GOOGLE_CALENDAR_ERROR"),
    );
  });
});
