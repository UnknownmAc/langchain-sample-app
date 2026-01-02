import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Calculator tool - Perform basic mathematical calculations
 */
export const calculate = tool(
  async ({ expression }) => {
    try {
      // Simple safe evaluation for basic math
      const result = Function(`"use strict"; return (${expression})`)();
      return `The result of ${expression} is ${result}`;
    } catch (error) {
      return `Error evaluating expression: ${(error as Error).message}`;
    }
  },
  {
    name: "calculate",
    description: "Perform basic mathematical calculations",
    schema: z.object({
      expression: z.string().describe("A mathematical expression to evaluate (e.g., '2 + 2', '10 * 5')"),
    }),
  }
);

