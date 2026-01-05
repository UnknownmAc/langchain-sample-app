/**
 * Autonomous Research Agent Module
 * 
 * This module demonstrates:
 * - Cyclic workflows with LangGraph
 * - Iterative research with query refinement
 * - Document relevance grading
 * - Long-running async processes
 * 
 * Usage:
 * ```typescript
 * import { runResearch, streamResearch } from "@/lib/research";
 * 
 * // Simple execution
 * const result = await runResearch("quantum computing basics");
 * console.log(result.synthesis);
 * 
 * // With streaming
 * for await (const update of streamResearch("machine learning")) {
 *   console.log(update);
 * }
 * ```
 */

export * from "./types";
export * from "./graph";
export { webSearch, batchSearch } from "./searchTool";

