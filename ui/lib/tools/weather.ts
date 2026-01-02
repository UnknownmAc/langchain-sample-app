import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Weather tool - Get the current weather for a given city
 */
export const getWeather = tool(
  async ({ city }) => {
    return `It's currently sunny and 72°F in ${city}!`;
  },
  {
    name: "get_weather",
    description: "Get the current weather for a given city",
    schema: z.object({
      city: z.string().describe("The name of the city to get weather for"),
    }),
  }
);

