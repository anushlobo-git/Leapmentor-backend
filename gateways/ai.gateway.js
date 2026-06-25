/**
 * @fileoverview AI Groq Infrastructure Engine Gateway
 * @description Direct outbound gateway handling communication with the external Groq API.
 * Receives config dependencies and environment tokens via injection.
 */

const AppError = require("../utils/AppError");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const createAiGateway = (apiKey) => {
  /**
   * Dispatches a structured chat context block payload straight to the Groq API clusters.
   * @param {Object} payload - Fully prepared Groq completion options body.
   * @returns {Promise<Object>} The raw JSON parsing data results.
   */
  const executeChatCompletion = async (payload) => {
    if (!apiKey) {
      throw new AppError("AI gateway credentials configuration missing.", 500);
    }

    let response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw new AppError(
        `AI endpoint gateway connection failure: ${networkError.message}`,
        502,
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new AppError("AI proxy engine gateway failure.", response.status);
    }

    return data;
  };

  return {
    executeChatCompletion,
  };
};

module.exports = createAiGateway;
