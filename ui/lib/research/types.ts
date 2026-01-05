/**
 * Types for the Autonomous Research Agent
 * 
 * This module demonstrates cyclic workflows in LangGraph
 * where the agent iteratively researches a topic until
 * it has gathered sufficient high-quality information.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface GradedDocument {
  document: SearchResult;
  relevanceScore: number; // 0-1
  reasoning: string;
  isRelevant: boolean;
}

export interface ResearchQuery {
  query: string;
  iteration: number;
  isRewrite: boolean;
}

/**
 * The state that flows through the research graph
 * This is the core of the cyclic workflow
 */
export interface ResearchState {
  // Input
  topic: string;
  
  // Query generation
  queries: ResearchQuery[];
  currentQueryIndex: number;
  
  // Search results
  searchResults: SearchResult[];
  
  // Grading
  gradedDocuments: GradedDocument[];
  relevantDocuments: GradedDocument[];
  
  // Iteration control (key for cyclic workflows)
  iteration: number;
  maxIterations: number;
  
  // Decision making
  needsMoreResearch: boolean;
  qualityThreshold: number; // Minimum relevance score (0-1)
  minRelevantDocs: number;  // Minimum number of relevant docs needed
  
  // Final output
  synthesis: string;
  status: "idle" | "generating_queries" | "searching" | "grading" | "rewriting" | "synthesizing" | "complete" | "error";
  error?: string;
  
  // Logging for UI
  logs: string[];
}

/**
 * Initial state factory
 */
export function createInitialState(topic: string): ResearchState {
  return {
    topic,
    queries: [],
    currentQueryIndex: 0,
    searchResults: [],
    gradedDocuments: [],
    relevantDocuments: [],
    iteration: 0,
    maxIterations: 3, // Prevent infinite loops
    needsMoreResearch: true,
    qualityThreshold: 0.6,
    minRelevantDocs: 3,
    synthesis: "",
    status: "idle",
    logs: [`Starting research on: "${topic}"`],
  };
}

/**
 * Configuration for the research agent
 */
export interface ResearchConfig {
  maxIterations?: number;
  qualityThreshold?: number;
  minRelevantDocs?: number;
  queriesPerIteration?: number;
}

