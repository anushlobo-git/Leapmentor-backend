const createMessageController = require("../../../controllers/message.controller");

describe("Message Controller Unit Tests", () => {
  let mockService, controller, mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockService = {
      getChatHistory: jest.fn(),
      getUnreadMessagesCount: jest.fn(),
    };
    controller = createMessageController(mockService);

    mockReq = {
      user: { _id: "u1" },
      params: { connectRequestId: "c1" },
      query: {},
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

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, messages: [] });
  });
});
