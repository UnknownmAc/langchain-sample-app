# TODO: Production Improvements

This document outlines recommended improvements to make the LangChain Agent app production-ready.

---

## 🔴 Critical (Required for Production)

### 1. Persistent Vector Store

**Current Issue:** Using in-memory `MemoryVectorStore` which loses all data on server restart or cold start.

**Recommended Solution:** Migrate to Pinecone (free tier available)

```bash
npm install @langchain/pinecone @pinecone-database/pinecone
```

**Implementation:**
- Sign up at [pinecone.io](https://www.pinecone.io/)
- Create an index with dimension `384` (matching our embeddings)
- Update `lib/vectorStore/store.ts` to use Pinecone instead of MemoryVectorStore

**Environment Variables:**
```
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=study-materials
```

---

### 2. Database for Document Metadata

**Current Issue:** Document metadata stored in JavaScript `Map` object, lost on restart.

**Recommended Solution:** Use Supabase PostgreSQL (free tier available)

```bash
npm install @supabase/supabase-js
```

**Database Schema:**
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  page_count INTEGER,
  chunk_count INTEGER,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  user_id TEXT -- for multi-user support
);
```

**Environment Variables:**
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

### 3. File Storage for PDFs

**Current Issue:** PDFs are processed in memory and not stored permanently.

**Recommended Solution:** Cloudflare R2 or AWS S3

```bash
npm install @aws-sdk/client-s3
```

**Benefits:**
- Users can re-download their uploaded PDFs
- Ability to re-process documents if needed
- Audit trail of uploads

---

## 🟡 Important (Recommended)

### 4. Better Embeddings

**Current Issue:** Using simple TF-IDF embeddings which lack semantic understanding.

**Recommended Solution:** OpenAI or Cohere embeddings

```bash
npm install @langchain/openai
# or
npm install @langchain/cohere
```

**Trade-offs:**
- Better semantic search quality
- Requires API key and has usage costs
- OpenAI: ~$0.0001 per 1K tokens

---

### 5. Authentication

**Current Issue:** No user authentication, anyone can access the app.

**Recommended Solutions:**
- **NextAuth.js** - Easy integration with Next.js
- **Clerk** - Drop-in auth components
- **Supabase Auth** - If already using Supabase

```bash
npm install next-auth
# or
npm install @clerk/nextjs
```

---

### 6. Rate Limiting

**Current Issue:** No protection against API abuse.

**Recommended Solution:** Use Upstash Redis for rate limiting

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Implementation:**
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});
```

---

### 7. Error Monitoring

**Current Issue:** Errors only logged to console, no visibility in production.

**Recommended Solution:** Sentry

```bash
npm install @sentry/nextjs
```

---

## 🟢 Nice to Have (Future Enhancements)

### 8. Streaming Responses

**Current Issue:** User waits for full response before seeing anything.

**Enhancement:** Stream LLM responses token by token for better UX.

**Implementation:** Use Vercel AI SDK with streaming

```bash
npm install ai
```

---

### 9. Multiple File Upload

**Current Issue:** Can only upload one PDF at a time.

**Enhancement:** Support batch upload with progress indicators.

---

### 10. Document Preview

**Enhancement:** Show PDF preview in the UI with page navigation.

```bash
npm install react-pdf
```

---

### 11. Conversation History Persistence

**Current Issue:** Conversation history lost on page refresh.

**Enhancement:** Store conversations in database for retrieval.

---

### 12. Multi-User Support

**Current Issue:** All users share the same vector store.

**Enhancement:** Namespace documents by user ID in vector store.

---

### 13. Document Chunking Improvements

**Current Issue:** Fixed chunk size may split content awkwardly.

**Enhancement:** Use semantic chunking based on document structure (headings, paragraphs).

---

### 14. Citation Links

**Enhancement:** Add clickable links to specific pages/sections when citing sources.

---

### 15. Export Conversations

**Enhancement:** Allow users to export chat history as PDF or Markdown.

---

## 📋 Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Pinecone Vector Store | Medium | Critical |
| 2 | Supabase for Metadata | Medium | Critical |
| 3 | Authentication | Medium | Important |
| 4 | Better Embeddings | Low | Important |
| 5 | Rate Limiting | Low | Important |
| 6 | Streaming Responses | Medium | Nice UX |
| 7 | Error Monitoring | Low | Important |
| 8 | File Storage | Medium | Nice to Have |

---

## 🔗 Useful Resources

- [Pinecone + LangChain Guide](https://js.langchain.com/docs/integrations/vectorstores/pinecone)
- [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

