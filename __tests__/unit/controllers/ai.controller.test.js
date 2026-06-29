/**
 * @fileoverview AI Assistance Interface Controller Unit Tests
 * @description Verifies payload parsing constraints, service integration arguments,
 * error propagation paths, and signature response serialization with zero network access.
 */

// CRITICAL FIX: Mock catchAsync to return the promise chain so tests can reliably await its completion.
jest.mock("../../../utils/catchAsync", () => {
  return (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
});

const createAiController = require("../../../controllers/ai.controller");

describe("AiController", () => {
  let mockAiService;
  let controller;
  let req;
  let res;
  let next;

  beforeEach(() => {
    // ── MOCK DEPENDENCIES
    mockAiService = {
      generateChatResponse: jest.fn(),
    };

    controller = createAiController({
      aiService: mockAiService,
    });

    // ── EXPRESS HTTP MOCKS
    req = {
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── handleChat ──────────────────────────────────────────────────────────
  describe("handleChat", () => {
    test("should return 200 and serialize chat response text array on success", async () => {
      req.body = {
        messages: [{ role: "user", content: "What is clean code?" }],
        systemPrompt: "You are an expert software craftsmanship coach.",
      };
      mockAiService.generateChatResponse.mockResolvedValue(
        "Clean code is reading code that is easy to understand.",
      );

      await controller.handleChat(req, res, next);

      expect(mockAiService.generateChatResponse).toHaveBeenCalledWith(
        req.body.messages,
        req.body.systemPrompt,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        content: [
          {
            type: "text",
            text: "Clean code is reading code that is easy to understand.",
          },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should handle varying message configurations and prompts dynamically", async () => {
      req.body = {
        messages: [
          { role: "user", content: "Explain asynchronous processing" },
        ],
        systemPrompt: "Keep it under two sentences.",
      };
      mockAiService.generateChatResponse.mockResolvedValue(
        "It allows execution to proceed without blocking.",
      );

      await controller.handleChat(req, res, next);

      expect(mockAiService.generateChatResponse).toHaveBeenCalledWith(
        req.body.messages,
        req.body.systemPrompt,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        content: [
          {
            type: "text",
            text: "It allows execution to proceed without blocking.",
          },
        ],
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("should call next(err) and withhold HTTP status updates when generation service throws", async () => {
      req.body = { messages: [{ role: "user", content: "Hello" }] };
      const error = new Error("LLM provider connection timeout exception");
      mockAiService.generateChatResponse.mockRejectedValue(error);

      await controller.handleChat(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
