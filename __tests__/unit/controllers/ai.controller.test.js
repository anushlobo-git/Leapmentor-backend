/**
 * @fileoverview AI Transport Boundary Controller Unit Tests
 */

const createAiController = require("../../../controllers/ai.controller");

describe("AI Assistance Router Interface Controller", () => {
  let mockService, controller, mockReq, mockRes, mockNext;
  const flushPromises = () => new Promise(setImmediate);

  beforeEach(() => {
    mockService = { generateChatResponse: jest.fn() };
    controller = createAiController(mockService);
    mockReq = {
      body: {
        messages: [{ role: "user", content: "test" }],
        systemPrompt: "custom",
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("handleChat should invoke service generation methods and return responses in standard chat shapes", async () => {
    mockService.generateChatResponse.mockResolvedValue("AI Message");

    await controller.handleChat(mockReq, mockRes, mockNext);
    await flushPromises();

    expect(mockService.generateChatResponse).toHaveBeenCalledWith(
      mockReq.body.messages,
      "custom",
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      content: [{ type: "text", text: "AI Message" }],
    });
  });
});
