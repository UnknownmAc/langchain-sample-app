/**
 * Research Agent Graph - Cyclic Workflow Implementation
 * 
 * This module demonstrates LangGraph's cyclic workflow capabilities.
 * 
 * WORKFLOW DIAGRAM:
 * 
 *     ┌─────────────────────────────────────────────────────────┐
 *     │                                                         │
 *     │  ┌──────────────┐    ┌─────────────┐    ┌───────────┐  │
 *     │  │   Generate   │───▶│   Search    │───▶│   Grade   │  │
 *     │  │   Queries    │    │  Documents  │    │ Documents │  │
 *     │  └──────────────┘    └─────────────┘    └─────┬─────┘  │
 *     │         ▲                                      │        │
 *     │         │                                      ▼        │
 *     │         │                              ┌───────────┐   │
 *     │         │                              │  Decide   │   │
 *     │         │                              │   Next    │   │
 *     │         │                              └─────┬─────┘   │
 *     │         │                                    │         │
 *     │         │          needsMoreResearch?        │         │
 *     │         │         ┌───────┴───────┐          │         │
 *     │         │         │               │          │         │
 *     │         │        YES              NO         │         │
 *     │         │         │               │          │         │
 *     │         └─────────┘               ▼          │         │
 *     │                           ┌───────────┐      │         │
 *     │                           │ Synthesize│◀─────┘         │
 *     │                           └─────┬─────┘                │
 *     │                                 │                      │
 *     │                                 ▼                      │
 *     │                              [END]                     │
 *     │                                                         │
 *     └─────────────────────────────────────────────────────────┘
 * 
 * KEY CONCEPTS:
 * 1. State Annotation: Defines the shape of data flowing through the graph
 * 2. Nodes: Functions that process state
 * 3. Edges: Connections between nodes (can be conditional)
 * 4. Cyclic Flow: The "rewrite" path creates a loop back to query generation
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { ResearchState, createInitialState, ResearchConfig } from "./types";
import {
  generateQueries,
  searchDocuments,
  gradeDocuments,
  decideNext,
  synthesizeResearch,
} from "./nodes";

/**
 * State Annotation for LangGraph
 * 
 * This defines how state updates are merged when nodes return partial state.
 * The 'reducer' functions specify how to combine old and new values.
 */
const ResearchAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  queries: Annotation<ResearchState["queries"]>({
    reducer: (_, y) => y, // Replace with new value
  }),
  currentQueryIndex: Annotation<number>(),
  searchResults: Annotation<ResearchState["searchResults"]>({
    reducer: (_, y) => y,
  }),
  gradedDocuments: Annotation<ResearchState["gradedDocuments"]>({
    reducer: (_, y) => y,
  }),
  relevantDocuments: Annotation<ResearchState["relevantDocuments"]>({
    reducer: (_, y) => y,
  }),
  iteration: Annotation<number>(),
  maxIterations: Annotation<number>(),
  needsMoreResearch: Annotation<boolean>(),
  qualityThreshold: Annotation<number>(),
  minRelevantDocs: Annotation<number>(),
  synthesis: Annotation<string>(),
  status: Annotation<ResearchState["status"]>(),
  error: Annotation<string | undefined>(),
  logs: Annotation<string[]>({
    reducer: (_, y) => y,
  }),
});

/**
 * Conditional edge function
 * 
 * This is the heart of the cyclic workflow!
 * After deciding, we either loop back or continue to synthesis.
 */
function shouldContinueResearch(state: typeof ResearchAnnotation.State): string {
  if (state.needsMoreResearch) {
    // CYCLE BACK to generate new queries
    return "generate_queries";
  }
  // Move forward to synthesis
  return "synthesize";
}

/**
 * Build the Research Agent Graph
 * 
 * This function creates and compiles the LangGraph workflow.
 */
export function buildResearchGraph() {
  // Create the graph with our state annotation
  const workflow = new StateGraph(ResearchAnnotation)
    // Add all nodes
    .addNode("generate_queries", generateQueries)
    .addNode("search", searchDocuments)
    .addNode("grade", gradeDocuments)
    .addNode("decide", decideNext)
    .addNode("synthesize", synthesizeResearch)

    // Define edges (the flow)
    .addEdge(START, "generate_queries")  // Start with query generation
    .addEdge("generate_queries", "search")  // Then search
    .addEdge("search", "grade")              // Then grade results
    .addEdge("grade", "decide")              // Then decide what to do

    // CONDITIONAL EDGE - This creates the cycle!
    .addConditionalEdges("decide", shouldContinueResearch, {
      generate_queries: "generate_queries",  // Loop back
      synthesize: "synthesize",               // Or continue
    })

    .addEdge("synthesize", END);  // End after synthesis

  // Compile the graph
  return workflow.compile();
}

/**
 * Run the research agent
 * 
 * This is the main entry point for executing research.
 */
export async function runResearch(
  topic: string,
  config?: ResearchConfig
): Promise<ResearchState> {
  const graph = buildResearchGraph();
  
  // Create initial state with optional config overrides
  const initialState = createInitialState(topic);
  if (config?.maxIterations) initialState.maxIterations = config.maxIterations;
  if (config?.qualityThreshold) initialState.qualityThreshold = config.qualityThreshold;
  if (config?.minRelevantDocs) initialState.minRelevantDocs = config.minRelevantDocs;

  // Execute the graph - this will run through all nodes including cycles
  const finalState = await graph.invoke(initialState);

  return finalState as ResearchState;
}

/**
 * Stream research progress
 * 
 * For long-running research, this allows streaming updates to the UI.
 */
export async function* streamResearch(
  topic: string,
  config?: ResearchConfig
): AsyncGenerator<Partial<ResearchState>> {
  const graph = buildResearchGraph();
  
  const initialState = createInitialState(topic);
  if (config?.maxIterations) initialState.maxIterations = config.maxIterations;
  if (config?.qualityThreshold) initialState.qualityThreshold = config.qualityThreshold;
  if (config?.minRelevantDocs) initialState.minRelevantDocs = config.minRelevantDocs;

  // Stream mode provides updates after each node execution
  const stream = await graph.stream(initialState, { streamMode: "updates" });

  for await (const update of stream) {
    // Each update contains the node name and its state changes
    yield update as Partial<ResearchState>;
  }
}

