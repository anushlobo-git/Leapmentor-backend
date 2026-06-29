/**
 * @fileoverview Complete Outbound Infrastructure Unit Tests Suite for AI Groq Gateway
 * @description Secures 100% statement, branch, function, and line execution coverage patterns.
 */

const createAiGateway = require("../../../gateways/ai.gateway");
const AppError = require("../../../utils/AppError");

describe("AI Infrastructure Gateway Engine Client Unit Tests", () => {
  let gateway;
  const mockApiKey = "mock_groq_api_secret_key";
  const mockPayload = {
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: "Ping" }],
  };

  beforeEach(() => {
    gateway = createAiGateway(mockApiKey);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Configuration & Credentials Security Gates", () => {
    test("should throw a 500 AppError if the instantiation credentials token is missing entirely", async () => {
      // Re-instantiate the gateway context without an API key string to force-trigger the boundary rule
      const brokenGateway = createAiGateway(null);

      await expect(
        brokenGateway.executeChatCompletion(mockPayload),
      ).rejects.toThrow(
        new AppError("AI gateway credentials configuration missing.", 500),
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Outbound Network Communication & Exception Handling Matrix", () => {
    test("should isolate core connection failures and translate rejections into a 502 AppError", async () => {
      // Simulate an unmanaged low-level sockets/network disconnection drop event
      global.fetch.mockRejectedValue(
        new Error("DNS resolution failed or connection timed out"),
      );

      await expect(gateway.executeChatCompletion(mockPayload)).rejects.toThrow(
        new AppError(
          "AI endpoint gateway connection failure: DNS resolution failed or connection timed out",
          502,
        ),
      );
    });

    test("should throw a relative pass-through status AppError if the external cluster returns an un-ok HTTP code", async () => {
      const mockErrorResponse = {
        error: { message: "Rate limit exceeded or invalid organization scope" },
      };
      global.fetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValue(mockErrorResponse),
      });

      await expect(gateway.executeChatCompletion(mockPayload)).rejects.toThrow(
        new AppError("AI proxy engine gateway failure.", 429),
      );
    });

    test("should successfully return completely parsed JSON data blocks upon receiving a 200 OK handshake response", async () => {
      const mockOutputSuccess = {
        choices: [{ message: { content: "Pong! AI Response complete." } }],
      };
      globalThis.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockOutputSuccess),
      });

      const result = await gateway.executeChatCompletion(mockPayload);

      // Verify structural request framing criteria matches expectations
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockApiKey}`,
          },
          body: JSON.stringify(mockPayload),
        },
      );
      expect(result).toEqual(mockOutputSuccess);
    });
  });
});
