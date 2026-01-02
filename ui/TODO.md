# TODO: Integrate HuggingFace Custom API as Model Provider

## Overview

Replace Groq with your custom HuggingFace API endpoint:
```
https://hugging-niskumar-api.vercel.app/api/generate
```

---

## Current Setup

- **Model Provider**: Groq (`llama-3.3-70b-versatile`)
- **Agent**: LangGraph ReAct Agent with tools
- **File**: `lib/agent.ts`

---

## Option 1: Simple Chat Mode (No Tools)

Your HuggingFace API doesn't support tool/function calling. Create a simple chat integration:

### Step 1: Create Simple Chat Client

Create `lib/chat/simpleChat.ts`:

```typescript
const API_URL = "https://hugging-niskumar-api.vercel.app/api/generate";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function formatPrompt(messages: Message[]): string {
  return messages
    .map(m => m.role === "user" ? `Human: ${m.content}` : `Assistant: ${m.content}`)
    .join("\n\n") + "\n\nAssistant:";
}

export async function simpleChat(messages: Message[]): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: formatPrompt(messages) }),
  });
  
  const data = await response.json();
  return data.response || data.text || data.generated_text;
}
```

### Step 2: Create API Route

Create `app/api/simple-chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { simpleChat } from "@/lib/chat/simpleChat";

export async function POST(request: NextRequest) {
  const { message, history = [] } = await request.json();
  
  const messages = [
    ...history,
    { role: "user", content: message }
  ];
  
  const response = await simpleChat(messages);
  return NextResponse.json({ response });
}
```

### Step 3: Update Frontend

Modify `app/page.tsx` to call `/api/simple-chat` instead of `/api/chat`.

---

## Option 2: Keep Agent Mode + Add HuggingFace for Simple Queries

Keep Groq for tool-based queries, add HuggingFace for simple chat:

1. Add mode toggle in UI (Agent vs Simple Chat)
2. Route to different endpoints based on mode
3. Tools only work in Agent mode (Groq)

---

## Option 3: Manual Tool Calling (Advanced)

Implement custom tool calling by parsing LLM responses:

### How it works:

1. Send system prompt teaching LLM to output tool calls in JSON format
2. Parse response for tool call patterns
3. Execute tools manually
4. Send results back to LLM

### Example System Prompt:

```
When you need to use a tool, respond with:
<tool>{"name": "tool_name", "args": {...}}</tool>

Available tools:
- get_weather: {"city": "string"}
- calculate: {"expression": "string"}
```

### Drawbacks:
- Less reliable than native function calling
- Requires custom parsing logic
- May produce malformed JSON

---

## Environment Variables

Add to `.env.local`:

```bash
# HuggingFace Custom API
HUGGINGFACE_API_URL=https://hugging-niskumar-api.vercel.app/api/generate

# Keep Groq for agent mode (optional)
GROQ_API_KEY=your-groq-key
```

---

## API Response Format

Ensure your HuggingFace API returns one of these formats:

```json
{ "response": "AI response text" }
// or
{ "text": "AI response text" }
// or
{ "generated_text": "AI response text" }
```

---

## Testing

```bash
# Test your API directly
curl -X POST https://hugging-niskumar-api.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

---

## Recommended Approach

**Option 1 (Simple Chat)** is recommended because:
- ✅ Works immediately with your API
- ✅ No tool calling issues
- ✅ Simple implementation
- ❌ No tools (weather, calculator, RAG)

If you need tools, keep Groq as the agent and add HuggingFace as an alternative simple chat mode.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `lib/chat/simpleChat.ts` | Create - Chat client |
| `app/api/simple-chat/route.ts` | Create - API route |
| `app/page.tsx` | Modify - Update endpoint or add mode toggle |
| `.env.local` | Modify - Add HUGGINGFACE_API_URL |
