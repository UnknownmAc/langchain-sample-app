import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { similaritySearchWithScores } from "../vectorStore";

/**
 * Study Buddy Tool
 * 
 * This tool queries the vector store containing uploaded study materials
 * and retrieves relevant context to answer questions.
 * 
 * Uses RAG (Retrieval Augmented Generation) pattern:
 * 1. Search vector store for relevant chunks
 * 2. Return context for LLM to synthesize answer
 */
export const queryStudyMaterials = tool(
  async ({ question, numResults }) => {
    try {
      // Search for relevant documents
      const results = await similaritySearchWithScores(question, numResults || 4);

      if (results.length === 0) {
        return JSON.stringify({
          success: false,
          message: "No study materials found. Please upload some PDFs first.",
          context: [],
        });
      }

      // Format results with metadata and relevance scores
      const context = results.map(([doc, score]) => ({
        content: doc.pageContent,
        source: doc.metadata.filename || "Unknown",
        documentId: doc.metadata.documentId,
        chunkIndex: doc.metadata.chunkIndex,
        relevanceScore: Math.round((1 - score) * 100) / 100, // Convert distance to similarity
      }));

      // Build a formatted context string for the LLM
      const contextText = context
        .map(
          (c, i) =>
            `[Source ${i + 1}: ${c.source}]\n${c.content}`
        )
        .join("\n\n---\n\n");

      return JSON.stringify({
        success: true,
        question,
        numResultsFound: results.length,
        context: contextText,
        sources: context.map((c) => ({
          filename: c.source,
          relevance: c.relevanceScore,
        })),
        instruction:
          "Use the above context from the user's study materials to answer their question. Cite the sources when possible.",
      });
    } catch (error) {
      // Check if it's a connection error to Chroma
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch")) {
        return JSON.stringify({
          success: false,
          message: "Cannot connect to the vector database. Please ensure Chroma is running.",
          error: errorMessage,
        });
      }
      
      return JSON.stringify({
        success: false,
        message: `Error searching study materials: ${errorMessage}`,
      });
    }
  },
  {
    name: "query_study_materials",
    description:
      "Search through uploaded PDF study materials to find relevant information for answering questions. Use this tool when the user asks about content from their uploaded documents, study materials, or PDFs.",
    schema: z.object({
      question: z
        .string()
        .describe("The question to search for in the study materials"),
      numResults: z
        .number()
        .optional()
        .default(4)
        .describe("Number of relevant chunks to retrieve (default: 4)"),
    }),
  }
);

/**
 * List available study materials
 */
export const listStudyMaterials = tool(
  async () => {
    try {
      // This is a simplified version - in production, you'd query document metadata
      const results = await similaritySearchWithScores("document", 10);
      
      // Extract unique documents from results
      const documents = new Map<string, { filename: string; documentId: string }>();
      
      for (const [doc] of results) {
        const docId = doc.metadata.documentId;
        if (docId && !documents.has(docId)) {
          documents.set(docId, {
            filename: doc.metadata.filename || "Unknown",
            documentId: docId,
          });
        }
      }

      if (documents.size === 0) {
        return JSON.stringify({
          success: true,
          message: "No study materials have been uploaded yet.",
          documents: [],
        });
      }

      return JSON.stringify({
        success: true,
        message: `Found ${documents.size} document(s) in your study materials.`,
        documents: Array.from(documents.values()),
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: `Error listing study materials: ${(error as Error).message}`,
      });
    }
  },
  {
    name: "list_study_materials",
    description:
      "List all uploaded PDF documents in the study materials. Use this when the user wants to know what documents they have uploaded.",
    schema: z.object({}),
  }
);

