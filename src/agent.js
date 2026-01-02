import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getWeather, calculate } from "./tools/index.js";

/**
 * Create the model using Groq (fast inference, generous free tier)
 * Requires GROQ_API_KEY environment variable
 * 
 * Available models:
 * - llama-3.3-70b-versatile (best quality)
 * - llama-3.1-8b-instant (fastest)
 * - mixtral-8x7b-32768
 */
const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
});

/**
 * Create the agent with tools
 */
export const agent = createReactAgent({
  llm: model,
  tools: [getWeather, calculate],
});
