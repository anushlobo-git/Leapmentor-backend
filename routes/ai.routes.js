/**
 * @fileoverview AI Assistance and Chat Proxy Routes
 * @description Proxies client conversations to the Groq API engine using fast LLM models.
 * Completely decoupled from concrete controller scripts via dependency parameter injection.
 */

const express = require("express");
const {
  chatCompletionBodyValidation,
} = require("../validations/ai.validation");

const createAiRoutes = (aiController, authenticate) => {
  const router = express.Router();

  // Enforce validation token verification to insulate the AI infrastructure layer
  router.use(authenticate);

  // @route   POST /api/v1/ai/chat
  router.post("/chat", chatCompletionBodyValidation, aiController.handleChat);

  return router;
};

module.exports = createAiRoutes;
