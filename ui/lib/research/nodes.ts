/**
 * Graph Nodes for Research Agent
 * 
 * Each node is a function that takes the current state and returns
 * a partial state update. These form the building blocks of the
 * cyclic workflow.
 */

import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ResearchState, ResearchQuery, GradedDocument, SearchResult } from "./types";
import { webSearch } from "./searchTool";

// Initialize the LLM for all nodes
const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
});

const analyticalLlm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0, // Deterministic for grading
});

/**
 * NODE 1: Generate Search Queries
 * 
 * Takes a topic and generates multiple search queries to explore it
 * from different angles.
 */
export async function generateQueries(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const isRewrite = state.iteration > 0;
  
  const systemPrompt = isRewrite
    ? `You are a research assistant. The previous search queries did not yield enough relevant results.
       
       Previous queries that didn't work well:
       ${state.queries.map((q) => `- ${q.query}`).join("\n")}
       
       Generate 3 NEW and DIFFERENT search queries that might find better information.
       Be more specific, try different angles, or use alternative terminology.
       
       Return ONLY the queries, one per line, no numbering or bullets.`
    : `You are a research assistant. Generate 3 diverse search queries to research the topic thoroughly.
       
       Consider different aspects:
       - Foundational/introductory content
       - Technical/detailed information  
       - Practical applications or examples
       
       Return ONLY the queries, one per line, no numbering or bullets.`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(`Topic: ${state.topic}`),
  ]);

  const content = typeof response.content === "string" 
    ? response.content 
    : String(response.content);

  const newQueries: ResearchQuery[] = content
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 3) // Max 3 queries
    .map((query) => ({
      query,
      iteration: state.iteration,
      isRewrite,
    }));

  return {
    queries: [...state.queries, ...newQueries],
    status: "generating_queries",
    logs: [
      ...state.logs,
      `[Iteration ${state.iteration + 1}] Generated ${newQueries.length} ${isRewrite ? "rewritten" : "initial"} queries:`,
      ...newQueries.map((q) => `  • ${q.query}`),
    ],
  };
}

/**
 * NODE 2: Search Documents
 * 
 * Executes all queries from the current iteration and collects results.
 */
export async function searchDocuments(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  // Get queries from current iteration
  const currentQueries = state.queries.filter(
    (q) => q.iteration === state.iteration
  );

  const allResults: SearchResult[] = [];

  for (const queryObj of currentQueries) {
    const results = await webSearch(queryObj.query);
    allResults.push(...results);
  }

  // Deduplicate by URL
  const uniqueResults = allResults.filter(
    (result, index, self) =>
      index === self.findIndex((r) => r.url === result.url)
  );

  return {
    searchResults: [...state.searchResults, ...uniqueResults],
    status: "searching",
    logs: [
      ...state.logs,
      `Found ${uniqueResults.length} unique documents from ${currentQueries.length} queries`,
    ],
  };
}

/**
 * NODE 3: Grade Documents
 * 
 * Uses LLM to evaluate relevance of each document to the research topic.
 * This is where the agent decides which information is valuable.
 */
export async function gradeDocuments(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  // Only grade new documents (not already graded)
  const gradedUrls = new Set(state.gradedDocuments.map((d) => d.document.url));
  const newDocuments = state.searchResults.filter(
    (doc) => !gradedUrls.has(doc.url)
  );

  if (newDocuments.length === 0) {
    return {
      status: "grading",
      logs: [...state.logs, "No new documents to grade"],
    };
  }

  const gradedDocs: GradedDocument[] = [];

  for (const doc of newDocuments) {
    const gradePrompt = `You are a document relevance grader. Evaluate if this document is relevant to the research topic.

TOPIC: ${state.topic}

DOCUMENT:
Title: ${doc.title}
URL: ${doc.url}
Content: ${doc.snippet || doc.content?.slice(0, 500)}

Rate the relevance from 0.0 to 1.0 and explain briefly.
Return ONLY a JSON object: {"score": 0.X, "reasoning": "brief explanation"}`;

    try {
      const response = await analyticalLlm.invoke([
        new HumanMessage(gradePrompt),
      ]);

      const content = typeof response.content === "string"
        ? response.content
        : String(response.content);

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        gradedDocs.push({
          document: doc,
          relevanceScore: Math.min(1, Math.max(0, parsed.score || 0)),
          reasoning: parsed.reasoning || "No reasoning provided",
          isRelevant: (parsed.score || 0) >= state.qualityThreshold,
        });
      }
    } catch (error) {
      // Default to low score on error
      gradedDocs.push({
        document: doc,
        relevanceScore: 0.3,
        reasoning: "Failed to grade document",
        isRelevant: false,
      });
    }
  }

  const newRelevant = gradedDocs.filter((d) => d.isRelevant);

  return {
    gradedDocuments: [...state.gradedDocuments, ...gradedDocs],
    relevantDocuments: [...state.relevantDocuments, ...newRelevant],
    status: "grading",
    logs: [
      ...state.logs,
      `Graded ${gradedDocs.length} documents:`,
      `  ✓ ${newRelevant.length} relevant (score >= ${state.qualityThreshold})`,
      `  ✗ ${gradedDocs.length - newRelevant.length} not relevant`,
    ],
  };
}

/**
 * NODE 4: Decide Next Step (Conditional Edge)
 * 
 * This is the KEY node for cyclic workflows!
 * It decides whether to:
 * - Continue to synthesis (enough good documents)
 * - Loop back to generate new queries (need more research)
 * - Stop due to max iterations reached
 */
export async function decideNext(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const totalRelevant = state.relevantDocuments.length;
  const hasEnoughDocs = totalRelevant >= state.minRelevantDocs;
  const reachedMaxIterations = state.iteration >= state.maxIterations - 1;

  let decision: string;
  let needsMore: boolean;

  if (hasEnoughDocs) {
    decision = `✓ Found ${totalRelevant} relevant documents (threshold: ${state.minRelevantDocs}). Proceeding to synthesis.`;
    needsMore = false;
  } else if (reachedMaxIterations) {
    decision = `⚠ Max iterations (${state.maxIterations}) reached with only ${totalRelevant} relevant docs. Proceeding with available information.`;
    needsMore = false;
  } else {
    decision = `↻ Only ${totalRelevant}/${state.minRelevantDocs} relevant docs found. Rewriting queries for iteration ${state.iteration + 2}...`;
    needsMore = true;
  }

  return {
    needsMoreResearch: needsMore,
    iteration: needsMore ? state.iteration + 1 : state.iteration,
    logs: [...state.logs, decision],
  };
}

/**
 * NODE 5: Synthesize Research
 * 
 * Combines all relevant documents into a comprehensive research summary.
 */
export async function synthesizeResearch(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  if (state.relevantDocuments.length === 0) {
    return {
      synthesis: "Unable to find relevant information on this topic. Please try a different research query.",
      status: "complete",
      logs: [...state.logs, "⚠ No relevant documents to synthesize"],
    };
  }

  const documentsContext = state.relevantDocuments
    .map(
      (d, i) => `
[Source ${i + 1}] ${d.document.title}
URL: ${d.document.url}
Relevance: ${(d.relevanceScore * 100).toFixed(0)}%
Content: ${d.document.content || d.document.snippet}
`
    )
    .join("\n---\n");

  const synthesisPrompt = `You are a research synthesizer. Create a comprehensive summary based on the following sources.

RESEARCH TOPIC: ${state.topic}

SOURCES:
${documentsContext}

RESEARCH PROCESS:
- Iterations: ${state.iteration + 1}
- Queries used: ${state.queries.length}
- Documents reviewed: ${state.gradedDocuments.length}
- Relevant sources: ${state.relevantDocuments.length}

Create a well-organized research summary that:
1. Introduces the topic
2. Covers key findings from the sources
3. Identifies any gaps or areas needing further research
4. Concludes with main takeaways

Use markdown formatting for readability.`;

  const response = await llm.invoke([new HumanMessage(synthesisPrompt)]);

  const synthesis = typeof response.content === "string"
    ? response.content
    : String(response.content);

  return {
    synthesis,
    status: "complete",
    logs: [
      ...state.logs,
      "✓ Research synthesis complete",
      `  Total iterations: ${state.iteration + 1}`,
      `  Sources cited: ${state.relevantDocuments.length}`,
    ],
  };
}

