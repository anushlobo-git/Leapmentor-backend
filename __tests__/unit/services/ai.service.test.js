/**
 * @fileoverview AI Service Unit Tests
 * @description Full branch coverage for generateChatResponse.
 */

const createAiService = require("../../../services/ai.service");

describe("AI Assistance Core Service Mechanics", () => {
  let mockAiGateway;
  let service;

  beforeEach(() => {
    mockAiGateway = { executeChatCompletion: jest.fn() };

    // ✅ Correct instantiation — matches the destructured signature
    service = createAiService({ aiGateway: mockAiGateway });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should use DEFAULT_SYSTEM_PROMPT and return content when systemPrompt is null", async () => {
    // Branch: systemPrompt || DEFAULT_SYSTEM_PROMPT  →  uses default
    // Branch: data.choices?.[0]?.message?.content || ""  →  returns content string
    mockAiGateway.executeChatCompletion.mockResolvedValue({
      choices: [{ message: { content: "Response generated." } }],
    });

    const result = await service.generateChatResponse(
      [{ role: "user", content: "Help me" }],
      null,
    );

    expect(mockAiGateway.executeChatCompletion).toHaveBeenCalledWith({
      model: "llama-3.1-8b-instant",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: "You are a helpful platform support assistant.",
        },
        { role: "user", content: "Help me" },
      ],
    });
    expect(result).toBe("Response generated.");
  });

  test("should use the provided systemPrompt when one is supplied", async () => {
    // Branch: systemPrompt || DEFAULT_SYSTEM_PROMPT  →  uses provided prompt
    mockAiGateway.executeChatCompletion.mockResolvedValue({
      choices: [{ message: { content: "Custom response." } }],
    });

    await service.generateChatResponse(
      [{ role: "user", content: "Hello" }],
      "You are a career coach.",
    );

    expect(mockAiGateway.executeChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: "system", content: "You are a career coach." },
        ]),
      }),
    );
  });

  test("should return empty string when response has no content", async () => {
    // Branch: data.choices?.[0]?.message?.content || ""  →  falls back to ""
    mockAiGateway.executeChatCompletion.mockResolvedValue({ choices: [] });

    const result = await service.generateChatResponse(
      [{ role: "user", content: "Hello" }],
      null,
    );

    expect(result).toBe("");
  });
});
