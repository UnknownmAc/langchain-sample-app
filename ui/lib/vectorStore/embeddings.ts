import { Embeddings } from "@langchain/core/embeddings";

/**
 * Simple TF-IDF-like Embeddings for Development
 * 
 * This is a lightweight embedding implementation that works without
 * external API calls or heavy dependencies. It uses a simple
 * bag-of-words approach with TF-IDF-like weighting.
 * 
 * For production, consider:
 * - OpenAI Embeddings
 * - Cohere Embeddings
 * - Local models with Ollama
 */

// Vocabulary built from documents
const vocabulary = new Map<string, number>();
let vocabIndex = 0;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function buildVocabulary(texts: string[]): void {
  for (const text of texts) {
    const tokens = tokenize(text);
    for (const token of tokens) {
      if (!vocabulary.has(token)) {
        vocabulary.set(token, vocabIndex++);
      }
    }
  }
}

function textToVector(text: string, dimensions: number = 384): number[] {
  const tokens = tokenize(text);
  const vector = new Array(dimensions).fill(0);
  
  // Count term frequencies
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }
  
  // Create sparse vector with hashing trick
  for (const [term, freq] of termFreq) {
    // Hash the term to get index
    let hash = 0;
    for (let i = 0; i < term.length; i++) {
      hash = ((hash << 5) - hash + term.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += freq / tokens.length; // Normalized TF
  }
  
  // L2 normalize
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }
  
  return vector;
}

/**
 * Simple embeddings class compatible with LangChain
 */
class SimpleEmbeddings extends Embeddings {
  private dimensions: number;

  constructor(dimensions: number = 384) {
    super({});
    this.dimensions = dimensions;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    buildVocabulary(texts);
    return texts.map((text) => textToVector(text, this.dimensions));
  }

  async embedQuery(text: string): Promise<number[]> {
    return textToVector(text, this.dimensions);
  }
}

/**
 * Create embeddings instance
 * Uses simple TF-IDF-like embeddings that work without external APIs
 */
export function createEmbeddings(): Embeddings {
  return new SimpleEmbeddings(384);
}

/**
 * Embed a single text string
 */
export async function embedText(text: string): Promise<number[]> {
  const embeddings = createEmbeddings();
  return await embeddings.embedQuery(text);
}

/**
 * Embed multiple text strings
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings = createEmbeddings();
  return await embeddings.embedDocuments(texts);
}
