const createMessageController = require("../../../controllers/message.controller");

describe("Message Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = {
      getChatHistory: jest.fn(),
      getUnreadMessagesCount: jest.fn(),
    };
    controller = createMessageController({ messageService: mockService });

    mockReq = {
      user: { _id: "u1" },
      params: { connectRequestId: "c1" },
      query: { page: 1 },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("getMessages should invoke service historical extraction matching payload arrays", async () => {
    mockService.getChatHistory.mockResolvedValue({ messages: [] });
    await controller.getMessages(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getChatHistory).toHaveBeenCalledWith("c1", "u1", { page: 1 });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, messages: [] });
  });

  test("getMessages should route errors to next()", async () => {
    const mockError = new Error("Db failed");
    mockService.getChatHistory.mockRejectedValue(mockError);
    await controller.getMessages(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockError);
  });

  test("getUnreadCount should return unread message count", async () => {
    mockService.getUnreadMessagesCount.mockResolvedValue({ count: 5 });
    await controller.getUnreadCount(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.getUnreadMessagesCount).toHaveBeenCalledWith("c1", "u1");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, count: 5 });
  });

  test("getUnreadCount should route errors to next()", async () => {
    const mockError = new Error("Db failed");
    mockService.getUnreadMessagesCount.mockRejectedValue(mockError);
    await controller.getUnreadCount(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});
