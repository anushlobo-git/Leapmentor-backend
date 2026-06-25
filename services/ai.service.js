/**
 * @fileoverview AI Assistance Core Orchestration Service
 * @description Manages conversational message normalization, system prompts,
 * and model assignments. Receives the injected API gateway wrapper.
 */

const TARGET_AI_MODEL = "llama-3.1-8b-instant";
const MAX_TOKEN_LIMIT = 1000;
const DEFAULT_SYSTEM_PROMPT = "You are a helpful platform support assistant.";

const createAiService = (aiGateway) => {
  /**
   * Contextualizes messages arrays and system parameters before dispatching requests.
   * @param {Array<Object>} messages - Conversational thread logs block array.
   * @param {string} [systemPrompt]  - Overriding identity context layout string.
   * @returns {Promise<string>} The parsed content string response text.
   */
  const generateChatResponse = async (messages, systemPrompt) => {
    const payload = {
      model: TARGET_AI_MODEL,
      max_tokens: MAX_TOKEN_LIMIT,
      messages: [
        { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
        ...messages,
      ],
    };

    const data = await aiGateway.executeChatCompletion(payload);
    return data.choices?.[0]?.message?.content || "";
  };

  return {
    generateChatResponse,
  };
};

module.exports = createAiService;
