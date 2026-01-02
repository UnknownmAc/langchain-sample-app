import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

export interface ChunkMetadata {
  documentId: string;
  filename: string;
  chunkIndex: number;
  totalChunks?: number;
}

export interface TextChunk {
  content: string;
  metadata: ChunkMetadata;
}

/**
 * Default text splitter configuration
 * - chunkSize: 1000 characters (good balance for context)
 * - chunkOverlap: 200 characters (preserves context between chunks)
 */
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Create a text splitter with configurable options
 */
export function createTextSplitter(
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP
): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });
}

/**
 * Split document content into chunks with metadata
 * 
 * @param content - The text content to split
 * @param documentId - Unique document identifier
 * @param filename - Original filename
 * @param chunkSize - Size of each chunk in characters
 * @param chunkOverlap - Overlap between chunks
 * @returns Array of text chunks with metadata
 */
export async function splitDocument(
  content: string,
  documentId: string,
  filename: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  chunkOverlap: number = DEFAULT_CHUNK_OVERLAP
): Promise<TextChunk[]> {
  const splitter = createTextSplitter(chunkSize, chunkOverlap);
  const texts = await splitter.splitText(content);
  
  return texts.map((text, index) => ({
    content: text,
    metadata: {
      documentId,
      filename,
      chunkIndex: index,
      totalChunks: texts.length,
    },
  }));
}

/**
 * Convert chunks to LangChain Document format
 * Ready for embedding and vector store insertion
 */
export function chunksToDocuments(chunks: TextChunk[]): Document[] {
  return chunks.map((chunk) => 
    new Document({
      pageContent: chunk.content,
      metadata: chunk.metadata,
    })
  );
}

/**
 * Process a PDF document: split content into chunks and convert to Documents
 */
export async function processDocumentForVectorStore(
  content: string,
  documentId: string,
  filename: string
): Promise<Document[]> {
  const chunks = await splitDocument(content, documentId, filename);
  return chunksToDocuments(chunks);
}
