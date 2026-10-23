/**
 * @fileoverview AI Assistance Interface Routing Controller
 * @description Parses chat requests and sends response tokens back to the user interface.
 */

const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/apiResponse");

const createAiController = ({ aiService }) => {
  /**
   * Proxy conversational interactions down to the support assistance services.
   * @route   POST /api/v1/ai/chat
   */
  const handleChat = catchAsync(async (req, res) => {
    const { messages, systemPrompt } = req.body;

    const text = await aiService.generateChatResponse(messages, systemPrompt);

    sendSuccess(res, { content: [{ type: "text", text }] }, "Chat response generated");
  });

  return {
    handleChat,
  };
};

module.exports = createAiController;
