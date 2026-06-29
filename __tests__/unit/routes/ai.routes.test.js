/**
 * @fileoverview AI Routing Pipeline Injections Tests
 */

const createAiRoutes = require("../../../routes/ai.routes");
const {
  chatCompletionBodyValidation,
} = require("../../../validations/ai.validation");

const mockRouter = { post: jest.fn(), use: jest.fn() };
jest.mock("express", () => ({ Router: () => mockRouter }));

describe("AI Subsystem Routing Architecture Pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should secure endpoints and inject schema validation parameters accurately", () => {
    const mockCtrl = { handleChat: jest.fn() };
    const mockAuth = jest.fn();

    // CRITICAL FIX: Align with production destructuring object properties exactly
    createAiRoutes({ aiController: mockCtrl, authenticate: mockAuth });

    expect(mockRouter.use).toHaveBeenCalledWith(mockAuth);
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/chat",
      chatCompletionBodyValidation,
      mockCtrl.handleChat,
    );
  });
});
