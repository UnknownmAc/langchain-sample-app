import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { safeEvaluate } from "../utils/mathEvaluator";

/**
 * Math Puzzle Solver Tool
 * 
 * This tool solves word problems by:
 * 1. Using an LLM to parse the word problem into a mathematical expression
 * 2. Using a safe calculator to compute the result (no hallucination)
 * 
 * This ensures accurate calculations while leveraging LLM for understanding.
 */

const parserModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0, // Deterministic for consistent parsing
});

const PARSER_SYSTEM_PROMPT = `You are a math expression extractor. Your job is to:
1. Read the word problem carefully
2. Extract ONLY the mathematical expression needed to solve it
3. Return ONLY the expression, nothing else

Rules:
- Use standard math operators: +, -, *, /, ^, (, )
- For percentages, convert to decimals (e.g., 20% = 0.20)
- For "of" in multiplication, use * (e.g., "half of 10" = "0.5 * 10")
- Return ONLY the expression, no explanation

Examples:
- "If John has 5 apples and buys 3 more, how many does he have?" → "5 + 3"
- "A shirt costs $50 with a 20% discount. What's the final price?" → "50 * (1 - 0.20)"
- "What is 15% of 200?" → "0.15 * 200"
- "If you divide 144 by 12, then multiply by 3?" → "(144 / 12) * 3"`;

async function parseWordProblem(problem: string): Promise<string> {
  const response = await parserModel.invoke([
    new SystemMessage(PARSER_SYSTEM_PROMPT),
    new HumanMessage(problem),
  ]);
  
  const expression = typeof response.content === "string" 
    ? response.content.trim() 
    : String(response.content).trim();
  
  // Clean up the expression (remove any markdown or extra text)
  const cleanExpression = expression
    .replace(/```[a-z]*\n?/g, "")
    .replace(/`/g, "")
    .trim();
  
  return cleanExpression;
}

export const solveMathPuzzle = tool(
  async ({ problem }) => {
    try {
      // Step 1: Parse the word problem into a math expression using LLM
      const expression = await parseWordProblem(problem);
      
      // Step 2: Safely evaluate the expression (no hallucination)
      const result = safeEvaluate(expression);
      
      if (result.error) {
        return `I understood the problem and extracted the expression "${expression}", but encountered an error during calculation: ${result.error}`;
      }
      
      // Step 3: Return structured result
      return JSON.stringify({
        problem: problem,
        expression: expression,
        result: result.value,
        explanation: `The word problem translates to: ${expression} = ${result.value}`,
      });
    } catch (error) {
      return `Error solving the math puzzle: ${(error as Error).message}`;
    }
  },
  {
    name: "solve_math_puzzle",
    description: "Solves word problems and math puzzles by extracting the mathematical expression and computing it accurately. Use this for complex word problems, percentage calculations, multi-step problems, or any math question that requires careful reasoning.",
    schema: z.object({
      problem: z.string().describe("The math word problem or puzzle to solve"),
    }),
  }
);

