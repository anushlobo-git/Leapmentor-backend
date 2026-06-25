/**
 * @fileoverview AI Service Functional Mapping Unit Tests
 */

const createAiService = require("../../../services/ai.service");

describe("AI Assistance Core Service Mechanics", () => {
  let mockGateway, service;

  beforeEach(() => {
    mockGateway = { executeChatCompletion: jest.fn() };
    service = createAiService(mockGateway);
  });

  test("generateChatResponse should append default system prompts and format payload structures properly", async () => {
    const mockGatewayResponse = {
      choices: [{ message: { content: "Response generated." } }],
    };
    mockGateway.executeChatCompletion.mockResolvedValue(mockGatewayResponse);

    const result = await service.generateChatResponse(
      [{ role: "user", content: "Help me" }],
      null,
    );

    expect(mockGateway.executeChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a helpful platform support assistant.",
          },
          { role: "user", content: "Help me" },
        ],
      }),
    );
    expect(result).toBe("Response generated.");
  });
});
