/**
 * @fileoverview AI Groq Gateway Client Connection Unit Tests
 */

const createAiGateway = require("../../../gateways/ai.gateway");
const AppError = require("../../../utils/AppError");

describe("AI Infrastructure Gateway Engine Client", () => {
  let gateway;

  beforeEach(() => {
    gateway = createAiGateway("mock_groq_api_secret_key");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("executeChatCompletion should return raw JSON objects upon receiving a 200 HTTP response", async () => {
    const mockOutput = { choices: [{ message: { content: "Hello back!" } }] };
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockOutput),
    });

    const result = await gateway.executeChatCompletion({ model: "test-model" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer mock_groq_api_secret_key",
        }),
      }),
    );
    expect(result).toEqual(mockOutput);
  });

  test("executeChatCompletion should throw an AppError if the external API cluster returns a 401 error", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: "Invalid Key" }),
    });

    await expect(gateway.executeChatCompletion({})).rejects.toThrow(
      new AppError("AI proxy engine gateway failure.", 401),
    );
  });
});

