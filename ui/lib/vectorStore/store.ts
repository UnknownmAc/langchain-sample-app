import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { createEmbeddings } from "./embeddings";

/**
 * Global singleton for vector store
 * Using globalThis ensures the instance persists across API routes in Next.js
 */
const globalForVectorStore = globalThis as unknown as {
  vectorStore: MemoryVectorStore | undefined;
};

/**
 * Get or create the in-memory vector store instance
 * Uses globalThis to persist across Next.js API routes
 */
export async function getVectorStore(): Promise<MemoryVectorStore> {
  if (globalForVectorStore.vectorStore) {
    return globalForVectorStore.vectorStore;
  }

  const embeddings = createEmbeddings();
  globalForVectorStore.vectorStore = new MemoryVectorStore(embeddings);

  return globalForVectorStore.vectorStore;
}

/**
 * Add documents to the vector store
 */
export async function addDocuments(documents: Document[]): Promise<string[]> {
  const store = await getVectorStore();
  await store.addDocuments(documents);
  
  console.log(`[VectorStore] Added ${documents.length} documents. Total: ${store.memoryVectors.length}`);
  
  const ids = documents.map((_, i) => `chunk_${Date.now()}_${i}`);
  return ids;
}

/**
 * Search for similar documents
 */
export async function similaritySearch(
  query: string,
  k: number = 4
): Promise<Document[]> {
  const store = await getVectorStore();
  console.log(`[VectorStore] Searching. Total documents: ${store.memoryVectors.length}`);
  return await store.similaritySearch(query, k);
}

/**
 * Search with scores for relevance ranking
 */
export async function similaritySearchWithScores(
  query: string,
  k: number = 4
): Promise<[Document, number][]> {
  const store = await getVectorStore();
  console.log(`[VectorStore] Searching with scores. Total documents: ${store.memoryVectors.length}`);
  
  if (store.memoryVectors.length === 0) {
    console.log("[VectorStore] No documents in store!");
    return [];
  }
  
  return await store.similaritySearchWithScore(query, k);
}

/**
 * Delete documents by their metadata filter
 */
export async function deleteDocumentsByFilter(
  filter: Record<string, string>
): Promise<void> {
  const store = await getVectorStore();
  
  const allDocs = store.memoryVectors;
  const filteredVectors = allDocs.filter((vec) => {
    const metadata = vec.metadata || {};
    return !Object.entries(filter).every(([key, value]) => metadata[key] === value);
  });
  
  store.memoryVectors = filteredVectors;
}

/**
 * Delete all documents from a specific source document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await deleteDocumentsByFilter({ documentId });
}

/**
 * Get the retriever for use in chains
 */
export async function getRetriever(k: number = 4) {
  const store = await getVectorStore();
  return store.asRetriever(k);
}

/**
 * Clear all documents from the store
 */
export async function clearVectorStore(): Promise<void> {
  const store = await getVectorStore();
  store.memoryVectors = [];
}

/**
 * Get document count
 */
export async function getDocumentCount(): Promise<number> {
  const store = await getVectorStore();
  return store.memoryVectors.length;
}
