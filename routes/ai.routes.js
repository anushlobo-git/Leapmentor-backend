/**
 * @fileoverview AI Assistance and Chat Proxy Routes
 * @description  Proxies client conversations to the Groq API engine using fast LLM models
 * to power the interactive help desk and support chat interfaces.
 * @prefix       /api/v1/ai
 * @access       Private (User)
 */
const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ── Groq API Gateway Configuration ───────────────────────────
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const TARGET_AI_MODEL = "llama-3.1-8b-instant";
const MAX_TOKEN_LIMIT = 1000;
const DEFAULT_SYSTEM_PROMPT = "You are a helpful platform support assistant.";

// ── AI ASSISTANCE ENDPOINTS ───────────────────────────────────
router.post(
  "/chat",
  catchAsync(async (req, res) => {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      throw new AppError("Messages array is required.", 400);
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: TARGET_AI_MODEL,
        max_tokens: MAX_TOKEN_LIMIT,
        messages: [
          { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new AppError("AI gateway failure.", response.status);
    }

    const text = data.choices?.[0]?.message?.content || "";
    res.status(200).json({
      content: [{ type: "text", text }],
    });
  }),
);

module.exports = router;
