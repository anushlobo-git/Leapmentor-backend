const createNotificationController = require("../../../controllers/notification.controller");

describe("Notification Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      getRecipientNotifications: jest.fn(),
      markAllNotificationsAsRead: jest.fn(),
      markOneNotificationAsRead: jest.fn(),
      removeNotificationRecord: jest.fn(),
      clearAllUserNotifications: jest.fn(),
    };
    controller = createNotificationController(mockService);
    mockReq = { user: { _id: "recipient_id" }, params: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("markAllRead should reply with a 200 HTTP status code", async () => {
    mockService.markAllNotificationsAsRead.mockResolvedValue();

    await controller.markAllRead(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "All notifications marked as read",
    });
  });
});
