const createNotificationController = require("../../../controllers/notification.controller");

describe("Notification Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      getRecipientNotifications: jest.fn(),
      markAllNotificationsAsRead: jest.fn(),
      markOneNotificationAsRead: jest.fn(),
      removeNotificationRecord: jest.fn(),
      clearAllUserNotifications: jest.fn(),
    };
    controller = createNotificationController({ notificationService: mockService });
    mockReq = { user: { _id: "recipient_id" }, params: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("getNotifications should return notifications list and 200 status", async () => {
    const mockList = [{ id: "n1", text: "New message" }];
    mockService.getRecipientNotifications.mockResolvedValue(mockList);

    await controller.getNotifications(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getRecipientNotifications).toHaveBeenCalledWith("recipient_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ notifications: mockList });
  });

  test("getNotifications should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.getRecipientNotifications.mockRejectedValue(error);

    await controller.getNotifications(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("markAllRead should reply with a 200 HTTP status code", async () => {
    mockService.markAllNotificationsAsRead.mockResolvedValue();

    await controller.markAllRead(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.markAllNotificationsAsRead).toHaveBeenCalledWith("recipient_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "All notifications marked as read",
    });
  });

  test("markAllRead should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.markAllNotificationsAsRead.mockRejectedValue(error);

    await controller.markAllRead(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("markOneRead should reply with 200 status", async () => {
    mockReq.params.id = "n1";
    mockService.markOneNotificationAsRead.mockResolvedValue();

    await controller.markOneRead(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.markOneNotificationAsRead).toHaveBeenCalledWith("n1", "recipient_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Notification marked as read",
    });
  });

  test("markOneRead should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.markOneNotificationAsRead.mockRejectedValue(error);

    await controller.markOneRead(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("deleteNotification should reply with 200 status", async () => {
    mockReq.params.id = "n1";
    mockService.removeNotificationRecord.mockResolvedValue();

    await controller.deleteNotification(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.removeNotificationRecord).toHaveBeenCalledWith("n1", "recipient_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Notification deleted",
    });
  });

  test("deleteNotification should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.removeNotificationRecord.mockRejectedValue(error);

    await controller.deleteNotification(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  test("clearAll should reply with 200 status", async () => {
    mockService.clearAllUserNotifications.mockResolvedValue();

    await controller.clearAll(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.clearAllUserNotifications).toHaveBeenCalledWith("recipient_id");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "All notifications cleared",
    });
  });

  test("clearAll should route error to next()", async () => {
    const error = new Error("Db failed");
    mockService.clearAllUserNotifications.mockRejectedValue(error);

    await controller.clearAll(mockReq, mockRes, mockNext);
    await flushPromises();
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
