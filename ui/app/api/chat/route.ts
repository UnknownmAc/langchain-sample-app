import { NextRequest, NextResponse } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { invokeAgent } from "@/lib/agent";

export async function POST(request: NextRequest) {
  try {
    const { message, threadId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Use provided threadId or generate a default one
    const conversationThreadId = threadId || "default-thread";

    // Invoke agent with memory support
    const response = await invokeAgent(
      [new HumanMessage(message)],
      conversationThreadId
    );

    const lastMessage = response.messages.at(-1);
    const content = lastMessage?.content || "No response";

    return NextResponse.json({ response: content });
  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
