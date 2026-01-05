import { NextRequest, NextResponse } from "next/server";
import { runResearch, streamResearch } from "@/lib/research";

/**
 * Research Agent API Endpoint
 * 
 * POST /api/research
 * Body: { topic: string, config?: { maxIterations?, qualityThreshold?, minRelevantDocs? } }
 * 
 * This endpoint runs the autonomous research agent which:
 * 1. Generates search queries
 * 2. Searches for documents
 * 3. Grades document relevance
 * 4. Iteratively refines queries if needed (CYCLIC WORKFLOW)
 * 5. Synthesizes findings into a report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, config, stream = false } = body;

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required and must be a string" },
        { status: 400 }
      );
    }

    if (topic.length < 3) {
      return NextResponse.json(
        { error: "Topic must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (topic.length > 500) {
      return NextResponse.json(
        { error: "Topic must be less than 500 characters" },
        { status: 400 }
      );
    }

    // Streaming mode for real-time updates
    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const update of streamResearch(topic, config)) {
              const data = JSON.stringify(update) + "\n";
              controller.enqueue(encoder.encode(`data: ${data}\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({ 
              error: (error as Error).message 
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming mode - wait for complete result
    const result = await runResearch(topic, config);

    return NextResponse.json({
      success: true,
      topic,
      synthesis: result.synthesis,
      stats: {
        iterations: result.iteration + 1,
        queriesGenerated: result.queries.length,
        documentsSearched: result.searchResults.length,
        documentsGraded: result.gradedDocuments.length,
        relevantDocuments: result.relevantDocuments.length,
      },
      relevantSources: result.relevantDocuments.map((d) => ({
        title: d.document.title,
        url: d.document.url,
        relevanceScore: d.relevanceScore,
      })),
      logs: result.logs,
    });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { 
        error: `Research failed: ${(error as Error).message}`,
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for checking API status
 */
export async function GET() {
  return NextResponse.json({
    status: "ready",
    description: "Autonomous Research Agent API",
    endpoints: {
      POST: {
        description: "Run research on a topic",
        body: {
          topic: "string (required)",
          config: {
            maxIterations: "number (default: 3)",
            qualityThreshold: "number 0-1 (default: 0.6)",
            minRelevantDocs: "number (default: 3)",
          },
          stream: "boolean (default: false)",
        },
      },
    },
  });
}

