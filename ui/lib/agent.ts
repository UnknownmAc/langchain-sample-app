import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { 
  getWeather, 
  calculate, 
  solveMathPuzzle, 
  queryStudyMaterials, 
  listStudyMaterials 
} from "./tools";

/**
 * Create the model using Groq
 */
const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
});

/**
 * Create a memory checkpointer
 * This enables the agent to remember conversation history
 */
const checkpointer = new MemorySaver();

/**
 * Create the agent with tools and memory
 * 
 * Available tools:
 * - getWeather: Get weather for a city
 * - calculate: Simple math calculations
 * - solveMathPuzzle: Solve word problems without hallucinating calculations
 * - queryStudyMaterials: Search uploaded PDFs for relevant information (RAG)
 * - listStudyMaterials: List all uploaded study documents
 */
export const agent = createReactAgent({
  llm: model,
  tools: [
    getWeather, 
    calculate, 
    solveMathPuzzle, 
    queryStudyMaterials, 
    listStudyMaterials
  ],
  checkpointer: checkpointer,
});

/**
 * Invoke the agent with memory support
 * 
 * @param messages - Array of LangChain messages
 * @param threadId - Unique identifier for the conversation thread
 */
export async function invokeAgent(
  messages: BaseMessage[],
  threadId: string
) {
  const response = await agent.invoke(
    { messages },
    { configurable: { thread_id: threadId } }
  );
  
  return response;
}

/**
 * Helper to create a human message
 */
export { HumanMessage };
