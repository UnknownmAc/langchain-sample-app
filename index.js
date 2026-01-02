import "dotenv/config";
import { agent } from "./src/agent.js";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Main function to run the agent demo
 */
async function main() {
  console.log("🤖 LangChain Agent Demo\n");
  console.log("=".repeat(50));
  
  // Example 1: Weather query
  console.log("\n📍 Query 1: What's the weather in Tokyo?");
  const weatherResponse = await agent.invoke({
    messages: [new HumanMessage("What's the weather in Tokyo?")],
  });
  const weatherAnswer = weatherResponse.messages.at(-1)?.content;
  console.log("Response:", weatherAnswer);
  
  // Example 2: Math calculation
  console.log("\n🔢 Query 2: Calculate something");
  const mathResponse = await agent.invoke({
    messages: [new HumanMessage("What is 3 multiplied by 7?")],
  });
  const mathAnswer = mathResponse.messages.at(-1)?.content;
  console.log("Response:", mathAnswer);
  
  // Example 3: Combined query
  console.log("\n🌍 Query 3: Multi-step query");
  const combinedResponse = await agent.invoke({
    messages: [new HumanMessage("What's the weather in New York and what's 100 divided by 4?")],
  });
  const combinedAnswer = combinedResponse.messages.at(-1)?.content;
  console.log("Response:", combinedAnswer);
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ Demo completed!");
}

// Run the main function
main().catch(console.error);
